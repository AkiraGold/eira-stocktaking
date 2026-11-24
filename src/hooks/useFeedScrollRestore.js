import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

function parseStoredRestore(storageKey) {
  if (typeof window === "undefined") {
    return { scrollY: null, anchorId: null, isRestoring: false };
  }
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return { scrollY: null, anchorId: null, isRestoring: false };
    const parsed = JSON.parse(raw);
    const scrollY = typeof parsed?.scrollY === "number" ? parsed.scrollY : null;
    const anchorId = parsed?.anchorId != null ? String(parsed.anchorId) : null;
    return {
      scrollY,
      anchorId,
      isRestoring: anchorId != null || scrollY != null,
    };
  } catch (_e) {
    return { scrollY: null, anchorId: null, isRestoring: false };
  }
}

export function useFeedScrollRestore({
  storageKey,
  itemCount,
  enabled = true,
}) {
  const restoringScrollRef = useRef(false);
  const pendingRestoreScrollYRef = useRef(null);
  const pendingRestoreAnchorIdRef = useRef(null);
  const [isRestoring, setIsRestoring] = useState(() => {
    if (!enabled) return false;
    return parseStoredRestore(storageKey).isRestoring;
  });
  const [prevStorageKey, setPrevStorageKey] = useState(storageKey);
  const [prevEnabled, setPrevEnabled] = useState(enabled);

  if (storageKey !== prevStorageKey || enabled !== prevEnabled) {
    setPrevStorageKey(storageKey);
    setPrevEnabled(enabled);
    const next = enabled
      ? parseStoredRestore(storageKey)
      : { scrollY: null, anchorId: null, isRestoring: false };
    setIsRestoring(next.isRestoring);
  }

  const finishRestore = useCallback(() => {
    restoringScrollRef.current = false;
    pendingRestoreScrollYRef.current = null;
    pendingRestoreAnchorIdRef.current = null;
    setIsRestoring(false);
  }, []);

  const persistScrollState = useCallback((meta = {}) => {
    if (!enabled || typeof window === "undefined" || isRestoring) return;
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          scrollY: window.scrollY,
          anchorId: meta?.anchorId ?? null,
          ts: Date.now(),
        })
      );
    } catch (_e) {}
  }, [enabled, storageKey, isRestoring]);

  const restoreScrollWithRetry = useCallback(
    (targetY) => {
      if (!enabled || typeof window === "undefined" || typeof targetY !== "number") return;
      restoringScrollRef.current = true;
      setIsRestoring(true);
      let attempts = 0;
      const maxAttempts = 600;

      const tick = () => {
        window.scrollTo(0, targetY);
        const maxScrollableY = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight
        );
        const enoughHeight = maxScrollableY >= targetY - 2;
        const reached = enoughHeight && Math.abs(window.scrollY - targetY) <= 2;

        if (reached || (enoughHeight && attempts > 2)) {
          finishRestore();
          return;
        }
        if (attempts >= maxAttempts) {
          finishRestore();
          return;
        }

        attempts += 1;
        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    },
    [enabled, finishRestore]
  );

  const restoreAnchorWithRetry = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;
    restoringScrollRef.current = true;
    setIsRestoring(true);
    let attempts = 0;
    const maxAttempts = 600;

    const tick = () => {
      const anchorId = pendingRestoreAnchorIdRef.current;
      if (anchorId == null) {
        finishRestore();
        return;
      }

      const target = document.querySelector(`[data-feed-item-id="${anchorId}"]`);
      if (target) {
        target.scrollIntoView({ block: "center" });
        finishRestore();
        return;
      }

      if (attempts >= maxAttempts) {
        const fallbackY = pendingRestoreScrollYRef.current;
        pendingRestoreAnchorIdRef.current = null;
        if (typeof fallbackY === "number") {
          restoreScrollWithRetry(fallbackY);
          return;
        }
        finishRestore();
        return;
      }

      attempts += 1;
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [enabled, finishRestore, restoreScrollWithRetry]);

  // Seed pending restore targets from sessionStorage (refs must not be written during render).
  useLayoutEffect(() => {
    if (!enabled || typeof window === "undefined") {
      pendingRestoreScrollYRef.current = null;
      pendingRestoreAnchorIdRef.current = null;
      return;
    }
    const next = parseStoredRestore(storageKey);
    pendingRestoreScrollYRef.current = next.scrollY;
    pendingRestoreAnchorIdRef.current = next.anchorId;
  }, [enabled, storageKey]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (
      pendingRestoreAnchorIdRef.current == null &&
      pendingRestoreScrollYRef.current == null
    ) {
      return;
    }
    const hydrationTimeout = setTimeout(() => {
      if (pendingRestoreAnchorIdRef.current == null && pendingRestoreScrollYRef.current == null) {
        setIsRestoring(false);
      }
    }, 5000);
    return () => {
      clearTimeout(hydrationTimeout);
    };
  }, [enabled, storageKey]);

  useEffect(() => {
    if (!enabled) return;
    if (itemCount === 0) return;
    if (pendingRestoreAnchorIdRef.current != null) {
      restoreAnchorWithRetry();
      return;
    }
    if (pendingRestoreScrollYRef.current == null) return;
    restoreScrollWithRetry(pendingRestoreScrollYRef.current);
  }, [enabled, itemCount, storageKey, restoreAnchorWithRetry, restoreScrollWithRetry]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const onScroll = () => persistScrollState();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [enabled, persistScrollState]);

  return { persistScrollState, isRestoring };
}
