import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { OFFLINE_SYNCED_EVENT } from "@/offline/offlineFetch";
import { getAuthHeadersSafe } from "@/utils/token";
import { useSettings } from "@/hooks/useSettings";
import { INVENTORY_STATES, INVENTORY_STATES_WITHOUT_UNCHECKED, INVENTORY_DISPLAY_MODE } from "@/utils/inventoryStates";
import {
  feedCanAppendMore,
  feedHighlightPage1Based,
  mergeFeedPageIntoItems,
  parsePagedFeedPage,
} from "@/utils/feedPagination";
import {
  clearLegacyFeedSessionStorage,
  clearStocktakingFeedMemoryCache,
  stocktakingFeedInFlight,
  stocktakingFeedResponseCache,
} from "@/utils/inventuraCache";

const FEED_CACHE_TTL_MS = 30000;

function invalidateFeedCaches() {
  clearStocktakingFeedMemoryCache();
}

export function useStocktakingFeed({
  eventId,
  sortBy,
  sortOrder,
  searchTerm,
  filterState,
  location,
  enabled = true,
}) {
  const { itemsPerPage, inventoryDisplayMode } = useSettings();

  const effectiveFeedState = useMemo(() => {
    const raw = filterState?.state || [];
    let states = [...raw];
    if (inventoryDisplayMode === INVENTORY_DISPLAY_MODE.WORKFLOW) {
      states = states.filter((s) => s !== INVENTORY_STATES.UNCHECKED);
      if (states.length === 0) {
        states = [...INVENTORY_STATES_WITHOUT_UNCHECKED];
      }
    }
    return states;
  }, [filterState?.state, inventoryDisplayMode]);

  const pageSize = itemsPerPage;
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [viewPageIndex, setViewPageIndex] = useState(0);
  const [nextAppendPage0, setNextAppendPage0] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const queryKey = useMemo(
    () =>
      JSON.stringify({
        eventId,
        sortBy,
        sortOrder,
        searchTerm,
        state: effectiveFeedState,
        displayMode: inventoryDisplayMode,
        hasNote: filterState?.hasNote || [],
        pageSize,
        room: location?.room || null,
        storey: location?.storey || null,
        building: location?.building || null,
      }),
    [eventId, sortBy, sortOrder, searchTerm, effectiveFeedState, inventoryDisplayMode, filterState?.hasNote, pageSize, location?.room, location?.storey, location?.building]
  );
  const feedEpoch = `${queryKey}|${enabled ? 1 : 0}`;
  const [prevFeedEpoch, setPrevFeedEpoch] = useState(feedEpoch);
  const feedRequestId = useRef(0);
  const appendLock = useRef(false);
  const replaceToPage0Ref = useRef(null);

  if (feedEpoch !== prevFeedEpoch) {
    setPrevFeedEpoch(feedEpoch);
    invalidateFeedCaches();
    setItems([]);
    setTotal(0);
    setViewPageIndex(0);
    setNextAppendPage0(0);
    setHasMore(true);
    setError(null);
  }

  const reset = useCallback(() => {
    invalidateFeedCaches();
    setItems([]);
    setTotal(0);
    setViewPageIndex(0);
    setNextAppendPage0(0);
    setHasMore(true);
    setError(null);
  }, []);

  const patchFeedItem = useCallback((updated) => {
    const id = updated?.id;
    if (id == null) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
    );
  }, []);

  const loadPageFromApi = useCallback(
    async (pageIndex0) => {
      if (!enabled || !eventId) throw new Error("feed disabled");
      const body = {
        eventId,
        page: pageIndex0,
        limit: pageSize,
        sortBy,
        sortOrder,
        search: searchTerm || "",
        state: effectiveFeedState,
        hasNote: filterState?.hasNote || [],
        roomId: location?.room || null,
        storeyId: location?.storey || null,
        buildingId: location?.building || null,
      };
      const requestKey = JSON.stringify(body);
      const now = Date.now();
      const cached = stocktakingFeedResponseCache.get(requestKey);
      let data;
      if (cached && now - cached.ts < FEED_CACHE_TTL_MS) {
        data = cached.data;
      } else if (stocktakingFeedInFlight.has(requestKey)) {
        data = await stocktakingFeedInFlight.get(requestKey);
      } else {
        const requestPromise = fetch("/api/objects/feed", {
          method: "POST",
          headers: getAuthHeadersSafe(),
          body: JSON.stringify(body),
        }).then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
          return res.json();
        });
        stocktakingFeedInFlight.set(requestKey, requestPromise);
        try {
          data = await requestPromise;
          stocktakingFeedResponseCache.set(requestKey, { ts: now, data });
        } finally {
          stocktakingFeedInFlight.delete(requestKey);
        }
      }
      return parsePagedFeedPage(data);
    },
    [enabled, eventId, sortBy, sortOrder, searchTerm, effectiveFeedState, filterState?.hasNote, pageSize, location?.room, location?.storey, location?.building]
  );

  const replaceToPage0 = useCallback(
    async (pageIndex0) => {
      if (!enabled || !eventId) return;
      const id = ++feedRequestId.current;
      setViewPageIndex(pageIndex0);
      setItems([]);
      setLoading(true);
      setError(null);
      try {
        const { pageItems, resolvedTotal, hasMoreNext } = await loadPageFromApi(pageIndex0);
        if (id !== feedRequestId.current) return;
        setTotal(resolvedTotal);
        setItems(pageItems);
        setNextAppendPage0(pageIndex0 + 1);
        setHasMore(hasMoreNext);
      } catch (e) {
        if (id === feedRequestId.current) setError(e);
      } finally {
        if (id === feedRequestId.current) setLoading(false);
      }
    },
    [enabled, eventId, loadPageFromApi]
  );

  const appendNextChunk = useCallback(async () => {
    if (!enabled || !eventId) return;
    if (!feedCanAppendMore(nextAppendPage0, total, pageSize)) return;
    if (appendLock.current) return;
    appendLock.current = true;
    const id = ++feedRequestId.current;
    const pageToFetch = nextAppendPage0;
    setLoading(true);
    setError(null);
    try {
      const { pageItems, resolvedTotal, hasMoreNext } = await loadPageFromApi(pageToFetch);
      if (id !== feedRequestId.current) return;
      setTotal(resolvedTotal);
      setItems((prev) => mergeFeedPageIntoItems(prev, pageItems));
      setNextAppendPage0((p) => p + 1);
      setHasMore(hasMoreNext);
    } catch (e) {
      if (id === feedRequestId.current) setError(e);
    } finally {
      appendLock.current = false;
      if (id === feedRequestId.current) setLoading(false);
    }
  }, [enabled, eventId, total, nextAppendPage0, pageSize, loadPageFromApi]);

  useEffect(() => {
    replaceToPage0Ref.current = replaceToPage0;
  });

  const goToPage1Based = useCallback((page1Based) => {
    const p0 = page1Based - 1;
    if (p0 < 0) return;
    void replaceToPage0(p0);
  }, [replaceToPage0]);

  /** Re-fetch page 0 (e.g. after mutations). Name kept for callers; not infinite-scroll append. */
  const loadMore = useCallback(() => {
    void replaceToPage0(0);
  }, [replaceToPage0]);

  /** Re-fetch current view after a mutation (clears all filter variants for this inventura). */
  const refreshFeed = useCallback(async () => {
    invalidateFeedCaches();
    await replaceToPage0(viewPageIndex);
  }, [replaceToPage0, viewPageIndex]);

  // Po odeslání změn uložených bez signálu načíst seznam znovu (mohl platit stav jiného uživatele).
  useEffect(() => {
    const onSynced = () => {
      if (enabled && eventId) void refreshFeed();
    };
    window.addEventListener(OFFLINE_SYNCED_EVENT, onSynced);
    return () => window.removeEventListener(OFFLINE_SYNCED_EVENT, onSynced);
  }, [refreshFeed, enabled, eventId]);

  useLayoutEffect(() => {
    clearLegacyFeedSessionStorage();
    if (!(enabled && eventId)) return undefined;
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      const load = replaceToPage0Ref.current;
      if (load) void load(0);
    })();
    return () => {
      cancelled = true;
    };
  }, [queryKey, enabled, eventId]);

  const highlightPage1Based = useMemo(
    () => feedHighlightPage1Based(viewPageIndex, nextAppendPage0, total, pageSize),
    [viewPageIndex, nextAppendPage0, total, pageSize]
  );
  const canAppendMore = useMemo(
    () => feedCanAppendMore(nextAppendPage0, total, pageSize),
    [nextAppendPage0, total, pageSize]
  );

  return {
    items,
    total,
    viewPageIndex,
    nextAppendPage0,
    loading,
    error,
    hasMore,
    goToPage1Based,
    appendNextChunk,
    reset,
    loadMore,
    refreshFeed,
    patchFeedItem,
    pageSize,
    highlightPage1Based,
    canAppendMore,
  };
}
