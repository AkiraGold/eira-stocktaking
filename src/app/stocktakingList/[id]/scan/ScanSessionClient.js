"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useUpdateInventoryObject, useInventoryObjectByQr } from "@/hooks/useStocktakingItems";
import { useOutsideInventuraQrItem } from "@/hooks/useOutsideInventuraQrItem";
import { useStocktakingFeed } from "@/hooks/useStocktakingFeed";
import { useFeedScrollRestore } from "@/hooks/useFeedScrollRestore";
import { useGetLocation } from "@/hooks/useLocation";
import InlineQrScanner from "@/components/organisms/InlineQrScanner";
import HeadingCard from "@/components/molecules/HeadingCard";
import { ContextButton, ContextRow } from "@/components/molecules/ContextMenu";
import CenteredModal from "@/components/molecules/CenteredModal";
import ActionFeedbackModal from "@/components/molecules/ActionFeedbackModal";
import ActionLoadingModal from "@/components/molecules/ActionLoadingModal";
import LocationPicker from "@/components/organisms/LocationPicker";
import UserLocationPicker from "@/components/organisms/UserLocationPicker";
import CardItemName from "@/components/atoms/CardItemName";
import StocktakingItemCard from "@/components/organisms/StocktakingItemCard";
import StocktakingItemCardSkeleton from "@/components/organisms/StocktakingItemCardSkeleton";
import StocktakingListItemViews from "../StocktakingListItemViews";
import Button from "@/components/atoms/Button";
import { Pagination } from "@/components/molecules/Pagination";
import { readScanListViewMode } from "@/utils/scanListViewMode";
import { INVENTORY_STATES, getEffectiveInvNumber, isFoundState, isMovedState, isNewState, resolveStateForMove, resolveStateForUpdate } from "@/utils/inventoryStates";
import ScanResultSheet from "@/components/organisms/ScanResultSheet";
import { useSettings } from "@/hooks/useSettings";
import { playScanFeedback } from "@/utils/scanFeedback";
import { useOfflineStatus } from "@/offline/useOfflineStatus";
import { buildInventoryStateContextRows } from "@/components/molecules/InventoryStateContextRows";
import {
    buildStocktakingNewItemUrl,
    buildStocktakingLinkItemUrl,
    buildScanUrl,
    buildStocktakingItemUrl,
    resolveScreenReturnTo,
    headingBackAction,
    HOME_PATH,
} from "@/utils/inventoryNavigation";

const SCAN_FEED_FILTER = { state: [], hasNote: [] };

const SCAN_NOTICE_DETAIL = "Na tomto místě je položka v inventuře už zahrnutá.";

function resolveImageSrc(image) {
    if (!image) return "/file.svg";
    if (/^data:image\//.test(image)) return image;
    if (/^[A-Za-z0-9+/=]+$/.test(image) && image.length > 100) return `data:image/*;base64,${image}`;
    return image;
}

export default function ScanSessionClient() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const getLocation = useGetLocation();

    const stocktakingId = Number.parseInt(String(params?.id ?? ""), 10);
    const canFetch = Number.isFinite(stocktakingId) && stocktakingId > 0;

    const [feedLocation, setFeedLocation] = useState(() => getLocation());

    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === "selectedLocation") {
                setFeedLocation(getLocation());
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, [getLocation]);

    const {
        items: feedItems,
        total: feedTotal,
        loading,
        error,
        goToPage1Based,
        appendNextChunk,
        loadMore,
        refreshFeed,
        patchFeedItem,
        reset: resetFeed,
        pageSize,
        highlightPage1Based,
        canAppendMore,
    } = useStocktakingFeed({
        eventId: stocktakingId,
        sortBy: "lastCheck",
        sortOrder: "desc",
        searchTerm: "",
        filterState: SCAN_FEED_FILTER,
        location: feedLocation,
        enabled: canFetch,
    });

    const feedItemsRef = useRef(feedItems);
    feedItemsRef.current = feedItems;

    const [viewMode, setViewMode] = useState(() => readScanListViewMode());

    useEffect(() => {
        const sync = () => setViewMode(readScanListViewMode());
        window.addEventListener("storage", sync);
        return () => {
            window.removeEventListener("storage", sync);
        };
    }, []);
    const [scannerCollapsed, setScannerCollapsed] = useState(false);
    const [lastScannedItem, setLastScannedItem] = useState(null);
    const [scanPending, setScanPending] = useState(false);
    const [scannedQr, setScannedQr] = useState(null);
    const [apiItem, apiLoading, apiError, resolvedQr] = useInventoryObjectByQr(scannedQr, stocktakingId);

    const [isNotInInventoryModalOpen, setIsNotInInventoryModalOpen] = useState(false);
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [pendingCreateQr, setPendingCreateQr] = useState(null);
    const [actionModalOpen, setActionModalOpen] = useState(false);
    const [actionModalContent, setActionModalContent] = useState({ title: "", message: "", success: false });
    const [isUpdatingItem, setIsUpdatingItem] = useState(false);

    const [scanNotice, setScanNotice] = useState({ open: false, item: null });
    /** Výsledek skenu ve spodním panelu: { kind: confirm|checked|move|done, item, loc?, undo?, message? } */
    const [scanSheet, setScanSheet] = useState(null);
    const sheetTimerRef = useRef(null);
    const { scanAutoMarkFound, scanFeedback } = useSettings();
    const { online } = useOfflineStatus();
    const scanFeedbackRef = useRef(scanFeedback);
    scanFeedbackRef.current = scanFeedback;
    const scanAutoMarkFoundRef = useRef(scanAutoMarkFound);
    scanAutoMarkFoundRef.current = scanAutoMarkFound;

    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [moveItem, setMoveItem] = useState(null);
    const [moveNewLocation, setMoveNewLocation] = useState(null);
    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
    const [isScanUserLocationModalOpen, setIsScanUserLocationModalOpen] = useState(false);
    const [isScanUserLocationNestedOpen, setIsScanUserLocationNestedOpen] = useState(false);

    const { updateItem } = useUpdateInventoryObject(stocktakingId);
    const {
        outsideInventuraItem,
        resetOutsideInventuraItem,
        lookupOutsideInventura,
        addOutsideItemToInventura,
        isLookingUpOutsideInventura,
        isAddingOutsideItem,
    } = useOutsideInventuraQrItem(stocktakingId);

    const backReturnTo = useMemo(
        () => resolveScreenReturnTo(searchParams, HOME_PATH),
        [searchParams]
    );
    const scanReturnTo = useMemo(
        () => buildScanUrl(stocktakingId, { returnTo: backReturnTo }),
        [stocktakingId, backReturnTo]
    );

    const scrollCacheKey = useMemo(() => {
        const r = feedLocation?.room ?? "";
        const s = feedLocation?.storey ?? "";
        const b = feedLocation?.building ?? "";
        return `stocktakingScanScroll_${stocktakingId}_${r}_${s}_${b}`;
    }, [stocktakingId, feedLocation?.room, feedLocation?.storey, feedLocation?.building]);
    const { persistScrollState } = useFeedScrollRestore({
        storageKey: scrollCacheKey,
        itemCount: feedItems.length,
        enabled: canFetch && scannerCollapsed,
    });

    const showActionModal = useCallback((title, message, success) => {
        setActionModalContent({ title, message, success });
        setActionModalOpen(true);
    }, []);

    const closeScanNotice = useCallback(() => {
        setScanNotice({ open: false, item: null });
    }, []);

    const clearSheetTimer = useCallback(() => {
        if (sheetTimerRef.current) {
            clearTimeout(sheetTimerRef.current);
            sheetTimerRef.current = null;
        }
    }, []);

    const closeScanSheet = useCallback(() => {
        clearSheetTimer();
        setScanSheet(null);
    }, [clearSheetTimer]);

    useEffect(() => clearSheetTimer, [clearSheetTimer]);

    const feedback = useCallback((kind) => {
        if (scanFeedbackRef.current) playScanFeedback(kind);
    }, []);

    /** Uloží změnu předmětu a ukáže panel „Uloženo" s možností vrátit zpět. */
    const saveFromSheet = useCallback(
        async (item, patch, message) => {
            clearSheetTimer();
            setIsUpdatingItem(true);
            try {
                const { image, ...rest } = item;
                const result = await updateItem({ ...rest, stocktakingId, ...patch });
                if (!result) {
                    feedback("error");
                    setScanSheet(null);
                    showActionModal("Chyba", "Změnu se nepodařilo uložit.", false);
                    return;
                }
                const saved = { ...item, ...result, state: result.state ?? patch.state ?? item.state, image: item.image };
                patchFeedItem(saved);
                refreshFeed();
                setLastScannedItem(saved);
                feedback("success");
                setScanSheet({
                    kind: "done",
                    item: saved,
                    message,
                    undo: { item: saved, patch: { state: item.state, location: item.location } },
                });
                sheetTimerRef.current = setTimeout(() => {
                    sheetTimerRef.current = null;
                    setScanSheet((cur) => (cur?.kind === "done" ? null : cur));
                }, 4000);
            } finally {
                setIsUpdatingItem(false);
            }
        },
        [clearSheetTimer, updateItem, stocktakingId, patchFeedItem, refreshFeed, feedback, showActionModal]
    );

    const markFoundFromSheet = useCallback(
        (item) =>
            saveFromSheet(
                item,
                { state: resolveStateForUpdate(INVENTORY_STATES.FOUND, item.state) },
                "Označeno jako nalezeno"
            ),
        [saveFromSheet]
    );

    const moveHereFromSheet = useCallback(
        (item, loc) =>
            saveFromSheet(item, { location: loc, state: resolveStateForMove(item.state) }, "Přesunuto do této místnosti"),
        [saveFromSheet]
    );

    const undoFromSheet = useCallback(async () => {
        const undo = scanSheet?.undo;
        if (!undo) return;
        clearSheetTimer();
        setIsUpdatingItem(true);
        try {
            const { image, ...rest } = undo.item;
            const result = await updateItem({ ...rest, stocktakingId, ...undo.patch });
            if (result) {
                const restored = { ...undo.item, ...result, ...undo.patch, image: undo.item.image };
                patchFeedItem(restored);
                refreshFeed();
                setLastScannedItem(restored);
                setScanSheet(null);
            } else {
                showActionModal("Chyba", "Změnu se nepodařilo vrátit.", false);
            }
        } finally {
            setIsUpdatingItem(false);
        }
    }, [scanSheet, clearSheetTimer, updateItem, stocktakingId, patchFeedItem, refreshFeed, showActionModal]);

    const scanSheetRef = useRef(scanSheet);
    scanSheetRef.current = scanSheet;

    const handleScan = useCallback((scannedValue) => {
        // Stejný kód znovu před kamerou nemá zavřít otevřený panel s volbou.
        const open = scanSheetRef.current;
        if (open && open.kind !== "done" && open.qr && open.qr === String(scannedValue).trim()) return;
        setLastScannedItem(null);
        resetOutsideInventuraItem();
        setIsNotInInventoryModalOpen(false);
        closeScanNotice();
        closeScanSheet();
        setScanPending(true);
        setScannedQr(scannedValue);
    }, [closeScanNotice, closeScanSheet, resetOutsideInventuraItem]);

    const addScannedItemToCurrentInventory = useCallback(async () => {
        setIsUpdatingItem(true);
        try {
            const loc = getLocation();
            const created = await addOutsideItemToInventura(loc || null);
            if (!created) return;

            setIsNotInInventoryModalOpen(false);
            showActionModal("Hotovo", "Položka byla přidána do aktuální inventury.", true);
            resetFeed();
            await loadMore();

            if (created.id) {
                router.push(
                    buildStocktakingItemUrl(stocktakingId, created.id, { returnTo: scanReturnTo })
                );
            }
        } catch (error) {
            showActionModal(
                "Chyba",
                error?.message || "Položku se nepodařilo přidat do inventury.",
                false
            );
        } finally {
            setIsUpdatingItem(false);
        }
    }, [
        addOutsideItemToInventura,
        getLocation,
        showActionModal,
        resetFeed,
        loadMore,
        router,
        stocktakingId,
        scanReturnTo,
    ]);

    useEffect(() => {
        if (!scannedQr) {
            return;
        }
        const normalizedScannedQr = String(scannedQr).trim();
        if (apiLoading) {
            return;
        }
        if (!apiItem && !apiError) {
            return;
        }
        if (resolvedQr !== normalizedScannedQr) {
            setScanPending(false);
            return;
        }

        setScannedQr(null);
        setScanPending(false);

        if (apiItem) {
            setLastScannedItem(apiItem);
            const loc = getLocation();
            const locationMismatch = Boolean(
                apiItem.location &&
                    loc?.room != null &&
                    loc.room !== "" &&
                    String(apiItem.location.room) !== String(loc.room)
            );
            const feedMatch = feedItemsRef.current.find((i) => Number(i.id) === Number(apiItem.id));
            const effectiveState = apiItem.state ?? feedMatch?.state;
            const sheetItem = {
                ...apiItem,
                state: effectiveState ?? apiItem.state,
                image: apiItem.image ?? feedMatch?.image,
                lastCheck: apiItem.lastCheck ?? feedMatch?.lastCheck,
                note: apiItem.note ?? feedMatch?.note,
                description: apiItem.description ?? feedMatch?.description,
            };
            if (locationMismatch) {
                feedback("warning");
                setScanSheet({ kind: "move", item: sheetItem, loc, qr: normalizedScannedQr });
            } else if (isFoundState(effectiveState) || isMovedState(effectiveState) || isNewState(effectiveState)) {
                feedback("warning");
                setScanSheet({ kind: "checked", item: sheetItem, qr: normalizedScannedQr });
            } else if (scanAutoMarkFoundRef.current) {
                markFoundFromSheet(sheetItem);
            } else {
                feedback("success");
                setScanSheet({ kind: "confirm", item: sheetItem, qr: normalizedScannedQr });
            }
        } else {
            feedback("warning");
            setPendingCreateQr(normalizedScannedQr);
            setIsNotInInventoryModalOpen(true);
            lookupOutsideInventura(normalizedScannedQr);
        }
    }, [apiItem, apiLoading, apiError, scannedQr, resolvedQr, getLocation, lookupOutsideInventura, feedback, markFoundFromSheet]);

    const renderItemActions = useCallback(
        (item) => (
            <ContextButton>
                <ContextRow
                    icon="edit"
                    label="Upravit"
                    action={() =>
                        router.push(
                            buildStocktakingItemUrl(stocktakingId, item.id, {
                                returnTo: scanReturnTo,
                                edit: true,
                            })
                        )
                    }
                />
                <ContextRow
                    icon="swap_horiz"
                    label="Přesun"
                    action={() => {
                        setMoveItem(item);
                        setMoveNewLocation(item.location);
                        setIsMoveModalOpen(true);
                    }}
                />
                {buildInventoryStateContextRows({
                    state: item.state,
                    onMarkFound: async () => {
                        setIsUpdatingItem(true);
                        try {
                            const { image, ...rest } = item;
                            const result = await updateItem({
                                ...rest,
                                stocktakingId,
                                state: resolveStateForUpdate(INVENTORY_STATES.FOUND, item.state),
                            });
                            if (result) {
                                patchFeedItem({ ...item, ...result, state: result.state ?? item.state });
                                await refreshFeed();
                                showActionModal("Hotovo", "Položka byla označena jako nalezena.", true);
                            } else {
                                showActionModal("Chyba", "Nepodařilo se označit položku jako nalezenou.", false);
                            }
                        } finally {
                            setIsUpdatingItem(false);
                        }
                    },
                    onMarkNotFound: async () => {
                        setIsUpdatingItem(true);
                        try {
                            const { image, ...rest } = item;
                            const result = await updateItem({
                                ...rest,
                                stocktakingId,
                                state: resolveStateForUpdate(INVENTORY_STATES.NOT_FOUND, item.state),
                            });
                            if (result) {
                                patchFeedItem({ ...item, ...result, state: result.state ?? item.state });
                                await refreshFeed();
                                showActionModal("Hotovo", "Položka byla označena jako nenalezena.", true);
                            } else {
                                showActionModal("Chyba", "Nepodařilo se označit položku jako nenalezenou.", false);
                            }
                        } finally {
                            setIsUpdatingItem(false);
                        }
                    },
                })}
            </ContextButton>
        ),
        [router, stocktakingId, updateItem, patchFeedItem, refreshFeed, showActionModal, scanReturnTo]
    );

    if (!canFetch) {
        return (
            <main className="relative min-h-screen flex flex-col items-center p-4">
                <div style={{ color: "var(--danger)", fontWeight: 600 }}>Neplatná inventura (chybí nebo je neplatné ID).</div>
            </main>
        );
    }

    return (
        <main
            className="relative flex flex-col items-center"
            style={{ height: "100dvh", maxHeight: "100dvh", overflow: "hidden", background: 'var(--surface)' }}
        >
            <div
                className="container"
                style={{
                    flex: 1,
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                    padding: "1rem",
                    paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
                    gap: "0.75rem",
                }}
            >
                <HeadingCard
                    heading="Skener inventury"
                    leftActions={[headingBackAction(backReturnTo)]}
                    rightActions={[
                        {
                            icon: "add",
                            title: "Přidat položku",
                            onClick: () => setIsAddItemModalOpen(true),
                        },
                        {
                            icon: "place",
                            title: "Změnit umístění",
                            onClick: () => setIsScanUserLocationModalOpen(true),
                        },
                    ]}
                />

                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 0,
                        width: "100%",
                    }}
                >
                    <div
                        style={{
                            flex: 1,
                            minHeight: 0,
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                        }}
                    >
                        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                            <InlineQrScanner
                                active={canFetch}
                                onScan={handleScan}
                                validate={false}
                                wrapperStyle={{ flex: 1 }}
                            />
                        </div>
                        <div
                            style={{
                                borderRadius: 16,
                                background: "var(--surface-2)",
                                padding: "0.65rem 0.75rem",
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 10,
                                flexShrink: 0,
                            }}
                        >
                            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}>
                                {scanPending ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)", fontSize: 14 }}>
                                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500" />
                                        Vyhledávám položku…
                                    </div>
                                ) : lastScannedItem ? (
                                    <div
                                        style={{
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            minWidth: 0,
                                        }}
                                        title={lastScannedItem.name}
                                    >
                                        <CardItemName>{lastScannedItem.name}</CardItemName>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 13, color: "var(--muted)" }}>Naskenujte QR kód položky.</div>
                                )}
                            </div>
                            <button
                                type="button"
                                aria-label="Zobrazit seznam"
                                onClick={() => setScannerCollapsed(true)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                    padding: "8px 14px",
                                    borderRadius: 999,
                                    border: "1px solid var(--line)",
                                    background: 'var(--surface)',
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    fontSize: 13,
                                    color: "var(--fg)",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                                    flexShrink: 0,
                                }}
                            >
                                <span className="material-icons-round" style={{ fontSize: 20 }}>
                                    expand_less
                                </span>
                                Seznam
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <button
                type="button"
                aria-label="Zavřít seznam"
                onClick={() => setScannerCollapsed(false)}
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 200,
                    border: "none",
                    padding: 0,
                    margin: 0,
                    cursor: scannerCollapsed ? "pointer" : "default",
                    background: "var(--overlay)",
                    WebkitTapHighlightColor: "transparent",
                    opacity: scannerCollapsed ? 1 : 0,
                    pointerEvents: scannerCollapsed ? "auto" : "none",
                    transition: "opacity 0.38s cubic-bezier(0.32, 0.72, 0, 1)",
                }}
            />

            <div
                style={{
                    position: "fixed",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 210,
                    width: "100%",
                    maxHeight: "min(92dvh, calc(100dvh - env(safe-area-inset-top) - 8px))",
                    display: "flex",
                    flexDirection: "column",
                    background: 'var(--surface)',
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    boxShadow: "0 -12px 48px rgba(0,0,0,0.18), 0 -1px 0 rgba(0,0,0,0.06)",
                    overflow: "hidden",
                    transform: scannerCollapsed ? "translate3d(0, 0, 0)" : "translate3d(0, calc(100% + 20px), 0)",
                    transition: "transform 0.52s cubic-bezier(0.32, 0.72, 0, 1)",
                    pointerEvents: scannerCollapsed ? "auto" : "none",
                }}
            >
                <button
                    type="button"
                    onClick={() => setScannerCollapsed(false)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "12px 16px",
                        margin: "12px 16px 8px",
                        borderRadius: 14,
                        background: "var(--surface-2)",
                        color: "var(--fg)",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: 15,
                        flexShrink: 0,
                        alignSelf: "stretch",
                    }}
                >
                    <span className="material-icons-round" style={{ fontSize: 20 }}>
                        close
                    </span>
                    Zavřít seznam
                </button>
                {error ? (
                    <div style={{ padding: "0 16px", color: "var(--danger)" }}>
                        Chyba: {error.message}
                    </div>
                ) : null}
                <div
                    style={{
                        flex: 1,
                        overflow: "auto",
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        padding: "0 16px max(12px, env(safe-area-inset-bottom))",
                        WebkitOverflowScrolling: "touch",
                    }}
                >
                    <StocktakingListItemViews
                        viewMode={viewMode}
                        loading={loading && feedItems.length === 0}
                        appendLoading={loading && feedItems.length > 0}
                        items={feedItems}
                        stocktakingId={stocktakingId}
                        pageSize={pageSize}
                        renderItemActions={renderItemActions}
                        onItemNavigate={(itemId) => persistScrollState({ anchorId: itemId })}
                        itemDetailReturnTo={scanReturnTo}
                    />
                    <Pagination
                        variant="feed"
                        total={feedTotal}
                        pageSize={pageSize}
                        highlightPage1Based={highlightPage1Based}
                        loading={loading}
                        onPageSelect1Based={goToPage1Based}
                        onAppendNext={appendNextChunk}
                        canAppendMore={canAppendMore}
                        appendNextLabel={`Načíst dalších ${pageSize}`}
                    />
                </div>
            </div>

                <CenteredModal
                    isOpen={isScanUserLocationModalOpen}
                    onClose={() => {
                        setIsScanUserLocationNestedOpen(false);
                        setIsScanUserLocationModalOpen(false);
                    }}
                    title="Aktuální umístění"
                    disableClickAway={isScanUserLocationNestedOpen}
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <UserLocationPicker
                            onChange={(loc) => setFeedLocation(loc)}
                            onModalOpen={() => setIsScanUserLocationNestedOpen(true)}
                            onModalClose={() => setIsScanUserLocationNestedOpen(false)}
                        />
                        <Button
                            variant="secondary"
                            icon="close"
                            iconPosition="right"
                            onClick={() => {
                                setIsScanUserLocationNestedOpen(false);
                                setIsScanUserLocationModalOpen(false);
                            }}
                        >
                            Zavřít
                        </Button>
                    </div>
                </CenteredModal>

                <CenteredModal
                    isOpen={isAddItemModalOpen}
                    onClose={() => setIsAddItemModalOpen(false)}
                    title="Přidat položku"
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
                        <Button
                            icon="add"
                            iconPosition="right"
                            onClick={() => {
                                setIsAddItemModalOpen(false);
                                router.push(
                                    buildStocktakingNewItemUrl(stocktakingId, { returnTo: scanReturnTo })
                                );
                            }}
                        >
                            Založit novou položku
                        </Button>
                        <Button
                            icon="search"
                            iconPosition="right"
                            onClick={() => {
                                setIsAddItemModalOpen(false);
                                router.push(
                                    buildStocktakingLinkItemUrl(stocktakingId, {
                                        returnTo: scanReturnTo,
                                    })
                                );
                            }}
                        >
                            Najít v majetku
                        </Button>
                        <Button
                            variant="secondary"
                            icon="close"
                            iconPosition="right"
                            onClick={() => setIsAddItemModalOpen(false)}
                        >
                            Storno
                        </Button>
                    </div>
                </CenteredModal>

                <CenteredModal isOpen={isNotInInventoryModalOpen} onClose={() => setIsNotInInventoryModalOpen(false)} title="QR Sken">
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div style={{ color: "var(--danger)", fontWeight: 600 }}>
                            Položka není součástí inventurního seznamu.
                        </div>
                        {isLookingUpOutsideInventura && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "0.5rem 0" }}>
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
                                <div style={{ fontSize: 13, color: "var(--muted)" }}>Vyhledávám položku podle QR...</div>
                            </div>
                        )}
                        {!isLookingUpOutsideInventura && outsideInventuraItem && (
                            <div
                                style={{
                                    borderRadius: 16,
                                    background: "var(--surface-2)",
                                    overflow: "hidden",
                                    display: "flex",
                                    flexDirection: "column",
                                    width: "100%",
                                }}
                            >
                                <img
                                    src={resolveImageSrc(outsideInventuraItem.image)}
                                    alt={outsideInventuraItem.name}
                                    style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                                />
                                <div className="p-4 gap-2 flex flex-col">
                                    <CardItemName>{outsideInventuraItem.name}</CardItemName>
                                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{outsideInventuraItem.note}</div>
                                    {outsideInventuraItem.qr && (
                                        <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                                            QR kód: {outsideInventuraItem.qr}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
                            {!isLookingUpOutsideInventura && outsideInventuraItem && !getEffectiveInvNumber(outsideInventuraItem) && (
                                <div style={{ fontSize: 12, color: "var(--danger)" }}>
                                    Položka nemá inventární číslo — nelze ji přidat do inventury.
                                </div>
                            )}
                            {!isLookingUpOutsideInventura && outsideInventuraItem && getEffectiveInvNumber(outsideInventuraItem) && (
                                <Button icon="playlist_add" iconPosition="right" onClick={addScannedItemToCurrentInventory}>
                                    {isAddingOutsideItem ? "Přidávám..." : "Přidat tuto položku do inventury"}
                                </Button>
                            )}
                            {!online && (
                                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>
                                    Bez signálu: předmět není v datech stažených do telefonu. Přidat nebo založit ho půjde po připojení.
                                </div>
                            )}
                            {online && !isLookingUpOutsideInventura && !outsideInventuraItem && (
                                <Button
                                    icon="add"
                                    iconPosition="right"
                                    onClick={() => {
                                        setIsNotInInventoryModalOpen(false);
                                        router.push(
                                            buildStocktakingNewItemUrl(stocktakingId, {
                                                qr: pendingCreateQr,
                                                returnTo: scanReturnTo,
                                            })
                                        );
                                    }}
                                >
                                    Založit novou položku
                                </Button>
                            )}
                            <Button variant="secondary" icon="close" iconPosition="right" onClick={() => setIsNotInInventoryModalOpen(false)}>
                                Storno
                            </Button>
                        </div>
                    </div>
                </CenteredModal>

                <CenteredModal isOpen={isMoveModalOpen} onClose={() => setIsMoveModalOpen(false)} title="Přesun položky" disableClickAway={isLocationPickerOpen}>
                    {moveItem && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div style={{ color: "var(--info)", fontWeight: 600 }}>Položka bude přesunuta do jiné místnosti</div>
                            <div
                                style={{
                                    borderRadius: 16,
                                    background: "var(--surface-2)",
                                    overflow: "hidden",
                                    display: "flex",
                                    flexDirection: "column",
                                    width: "100%",
                                }}
                            >
                                {moveItem.image && (
                                    <img
                                        src={resolveImageSrc(moveItem.image)}
                                        alt={moveItem.name}
                                        style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }}
                                    />
                                )}
                                <div className="p-4 gap-4 flex flex-col">
                                    <div>
                                        <CardItemName>{moveItem.name}</CardItemName>
                                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{moveItem.note}</div>
                                    </div>
                                    <div style={{ fontStyle: "italic", fontSize: 12, color: "var(--muted)" }}>
                                        Poslední kontrola {moveItem.lastCheck ? new Date(moveItem.lastCheck).toLocaleString() : ""}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
                                <LocationPicker value={moveItem.location} label="Aktuální umístění:" editMode={false} />
                                <span className="material-icons-round" style={{ fontSize: 24, color: 'var(--fg)' }}>
                                    arrow_downward
                                </span>
                                <LocationPicker
                                    value={moveNewLocation}
                                    label="Nové umístění:"
                                    editMode={true}
                                    onChange={setMoveNewLocation}
                                    onModalOpen={() => setIsLocationPickerOpen(true)}
                                    onModalClose={() => setIsLocationPickerOpen(false)}
                                />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
                                <Button
                                    icon="check"
                                    iconPosition="right"
                                    onClick={async () => {
                                        if (!moveNewLocation) return;
                                        setIsUpdatingItem(true);
                                        try {
                                            const { image, ...rest } = moveItem;
                                            const result = await updateItem({
                                                ...rest,
                                                stocktakingId,
                                                location: moveNewLocation,
                                                state: resolveStateForMove(moveItem.state),
                                            });
                                            setIsMoveModalOpen(false);
                                            setMoveItem(null);
                                            setMoveNewLocation(null);
                                            if (result) {
                                                patchFeedItem(result);
                                                await refreshFeed();
                                                showActionModal("Hotovo", "Položka byla úspěšně přesunuta.", true);
                                            } else {
                                                showActionModal("Chyba", "Položku se nepodařilo přesunout.", false);
                                            }
                                        } finally {
                                            setIsUpdatingItem(false);
                                        }
                                    }}
                                >
                                    Potvrdit změnu lokace
                                </Button>
                                <Button variant="secondary" icon="close" iconPosition="right" onClick={() => setIsMoveModalOpen(false)}>
                                    Storno
                                </Button>
                            </div>
                        </div>
                    )}
                </CenteredModal>

                <CenteredModal isOpen={scanNotice.open} onClose={closeScanNotice} title="QR Sken">
                    {scanNotice.item ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 13,
                                    lineHeight: 1.45,
                                    color: "var(--muted)",
                                }}
                            >
                                {SCAN_NOTICE_DETAIL}
                            </p>
                            <div style={{ width: "100%", minWidth: 0 }}>
                                <StocktakingItemCard
                                    item={scanNotice.item}
                                    compact={false}
                                    enableLazyImageFetch={true}
                                />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
                                <Button
                                    icon="edit"
                                    iconPosition="right"
                                    onClick={() => {
                                        const id = scanNotice.item?.id;
                                        closeScanNotice();
                                        if (id) {
                                            router.push(
                                                buildStocktakingItemUrl(stocktakingId, id, {
                                                    returnTo: scanReturnTo,
                                                    edit: true,
                                                })
                                            );
                                        }
                                    }}
                                >
                                    Upravit
                                </Button>
                                <Button variant="secondary" icon="close" iconPosition="right" onClick={closeScanNotice}>
                                    Storno
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </CenteredModal>

                <ScanResultSheet
                    sheet={scanSheet}
                    onClose={closeScanSheet}
                    onMarkFound={() => scanSheet?.item && markFoundFromSheet(scanSheet.item)}
                    onMoveHere={() => scanSheet?.item && moveHereFromSheet(scanSheet.item, scanSheet.loc)}
                    onMoveElsewhere={() => {
                        const it = scanSheet?.item;
                        const loc = scanSheet?.loc;
                        closeScanSheet();
                        if (!it) return;
                        setMoveItem(it);
                        setMoveNewLocation(loc ?? it.location);
                        setIsMoveModalOpen(true);
                    }}
                    onEdit={() => {
                        const id = scanSheet?.item?.id;
                        closeScanSheet();
                        if (id) {
                            router.push(buildStocktakingItemUrl(stocktakingId, id, { returnTo: scanReturnTo, edit: true }));
                        }
                    }}
                    onUndo={undoFromSheet}
                />

                <ActionFeedbackModal
                    isOpen={actionModalOpen}
                    onClose={() => setActionModalOpen(false)}
                    title={actionModalContent.title}
                    message={actionModalContent.message}
                    success={actionModalContent.success}
                />

                <ActionLoadingModal isOpen={isUpdatingItem || isAddingOutsideItem} />
        </main>
    );
}
