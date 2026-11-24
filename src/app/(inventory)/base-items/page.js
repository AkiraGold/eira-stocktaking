"use client";
import React, { useState, useCallback } from "react";
import Link from "next/link";
import QRScannerModal from "@/components/organisms/QRScannerModal";
import { useRouter } from "next/navigation";
import HeadingCard from "@/components/molecules/HeadingCard";
import { ContextButton, ContextRow } from "@/components/molecules/ContextMenu";
import SortOptionsModal from "@/components/organisms/SortOptionsModal";
import StocktakingItemCard from "@/components/organisms/StocktakingItemCard";
import StocktakingItemCardSkeleton from "@/components/organisms/StocktakingItemCardSkeleton";
import AddToInventoryModal from "@/components/organisms/AddToInventoryModal";
import StateBadge from "@/components/atoms/StateBadge";
import Button from "@/components/atoms/Button";
import { Pagination } from "@/components/molecules/Pagination";
import UserLocationPicker from "@/components/organisms/UserLocationPicker";
import { useBaseItemsInventoryLayout } from "@/contexts/BaseItemsInventoryLayoutContext";
import { useInventoryMembership } from "@/hooks/useInventoryMembership";
import {
  buildStocktakingNewItemUrl,
  buildStocktakingItemUrl,
  headingBackAction,
  HOME_PATH,
} from "@/utils/inventoryNavigation";
import { useSelectedInventura } from "@/hooks/useSelectedInventura";
import { isInventuraActive } from "@/utils/inventuraEventStates";
import { useSettings } from "@/hooks/useSettings";
import { useOfflineStatus } from "@/offline/useOfflineStatus";
import { INVENTORY_DISPLAY_MODE, isUncheckedState } from "@/utils/inventoryStates";

const sortOptions = [
    { label: "ID", value: "id" },
    { label: "Jméno", value: "name" },
    { label: "Popisek", value: "description" },
];

const RETURN_TO = "/base-items";

function stop(e) {
    e.preventDefault();
    e.stopPropagation();
}

export default function BaseItemsPage() {
    const router = useRouter();
    const { selectedInventura } = useSelectedInventura();
    const inventuraId = isInventuraActive(selectedInventura) ? Number(selectedInventura.id) : null;
    const {
        pageState,
        updatePageState,
        pageSize,
        handleLocationChange,
        items,
        total,
        loading,
        error,
        goToPage1Based,
        appendNextChunk,
        highlightPage1Based,
        canAppendMore,
        persistFeedState,
        persistScrollState,
    } = useBaseItemsInventoryLayout();

    const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);
    const [lastScannedQr, setLastScannedQr] = useState(null);
    const [addItem, setAddItem] = useState(null);
    const [addedName, setAddedName] = useState("");

    const { inventoryDisplayMode } = useSettings();
    const { online } = useOfflineStatus();
    const workflowMode = inventoryDisplayMode === INVENTORY_DISPLAY_MODE.WORKFLOW;
    const searchTerm = String(pageState.searchTerm || "").trim();
    const membership = useInventoryMembership({ eventId: inventuraId, search: searchTerm });

    const viewModes = [
        { mode: "grid", icon: "view_module" },
        { mode: "detailed", icon: "view_list" },
        { mode: "compact", icon: "view_agenda" },
    ];
    const currentViewIdx = Math.max(0, viewModes.findIndex((vm) => vm.mode === pageState.viewMode));
    const nextViewMode = () => {
        const newViewMode = viewModes[(currentViewIdx + 1) % viewModes.length].mode;
        updatePageState({ viewMode: newViewMode });
    };

    /** Sken QR v majetku: kód se použije jako hledaný výraz a zapamatuje se pro založení nového předmětu. */
    function handleScan(value) {
        const code = String(value ?? "").trim();
        setIsQRModalOpen(false);
        if (!code) return;
        setLastScannedQr(code);
        updatePageState({ searchTerm: code, currentPage: 0 });
    }

    const newItemUrl = inventuraId
        ? buildStocktakingNewItemUrl(inventuraId, { returnTo: RETURN_TO, qr: lastScannedQr || undefined })
        : null;

    const renderItemActions = (item) => (
        <ContextButton>
            <ContextRow
                icon="edit"
                label="Upravit"
                action={() => router.push(`/itemList/${item.id}?edit=1`)}
            />
            <ContextRow
                icon="visibility"
                label="Zobrazit detail"
                action={() => router.push(`/itemList/${item.id}`)}
            />
        </ContextButton>
    );

    /** Pod kartou: stav v inventuře, nebo tlačítko Přidat. Jen když hledám a mám aktivní inventuru. */
    const renderMembership = useCallback(
        (item) => {
            if (!inventuraId || !searchTerm || !membership.known) return null;
            const inInventory = membership.findInInventory(item);
            if (inInventory) {
                return (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>V inventuře</span>
                        {/* V režimu Pracovní neprozrazujeme, že předmět je očekávaný a dosud nezkontrolovaný. */}
                        {workflowMode && isUncheckedState(inInventory.state) ? null : <StateBadge state={inInventory.state} />}
                        {inInventory.id ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    stop(e);
                                    router.push(buildStocktakingItemUrl(inventuraId, inInventory.id, { returnTo: RETURN_TO }));
                                }}
                                style={{ marginLeft: "auto", border: "none", background: "none", color: "var(--info)", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 4 }}
                            >
                                Otevřít
                            </button>
                        ) : null}
                    </div>
                );
            }
            return (
                <button
                    type="button"
                    onClick={(e) => {
                        stop(e);
                        setAddItem(item);
                    }}
                    style={{
                        marginTop: 10,
                        width: "100%",
                        minHeight: 40,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        borderRadius: 12,
                        border: "1px solid var(--accent)",
                        background: "var(--accent)",
                        color: "var(--accent-ink)",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                    }}
                >
                    <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 18 }}>playlist_add</span>
                    Přidat do inventury
                </button>
            );
        },
        [inventuraId, searchTerm, membership, router, workflowMode]
    );

    const renderCard = (item, compact) => (
        <Link
            key={item.id}
            href={`/itemList/${item.id}`}
            scroll={false}
            onClick={() => {
                persistFeedState();
                persistScrollState({ anchorId: item.id });
            }}
            style={{ textDecoration: "none" }}
            data-feed-item-id={item.id}
        >
            <StocktakingItemCard
                item={item}
                renderActions={renderItemActions}
                renderQuickActions={renderMembership}
                compact={compact}
                enableLazyImageFetch={true}
                showInventoryDetails={false}
                useStateColor={false}
            />
        </Link>
    );

    const isGrid = pageState.viewMode === "grid";
    const isCompact = pageState.viewMode === "compact";
    const skeletons = (prefix) =>
        Array.from({ length: pageSize }, (_, index) => (
            <StocktakingItemCardSkeleton key={`${prefix}-${index}`} compact={isCompact} />
        ));

    let statusLine = "Celá evidence majetku";
    if (searchTerm) {
        statusLine = loading ? "Hledám v celé evidenci majetku…" : `Hledám v celé evidenci majetku · ${total} výsledků`;
        if (inventuraId && membership.loading) statusLine += " · ověřuji inventuru…";
    }

    return (
        <main className="relative min-h-screen flex flex-col items-center">
            <div
                className="container"
                style={{
                    minHeight: "100vh", background: "var(--bg)",
                    display: "flex",
                    padding: "1rem",
                    flexDirection: "column",
                    gap: "1rem",
                }}
            >
                <HeadingCard
                    heading="Majetek"
                    leftActions={[headingBackAction(HOME_PATH)]}
                    rightActions={[
                        {
                            icon: viewModes[currentViewIdx].icon,
                            onClick: nextViewMode,
                            title: "Změnit zobrazení",
                        },
                        { icon: "sort", onClick: () => setIsOptionsModalOpen(true), title: "Řazení" },
                    ]}
                />

                <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                    <label
                        style={{
                            flex: 1,
                            minWidth: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            borderRadius: 16,
                            background: "var(--surface-2)",
                            padding: "0 12px",
                            minHeight: 48,
                        }}
                    >
                        <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 20, color: "var(--muted)" }}>search</span>
                        <input
                            type="text"
                            inputMode="search"
                            placeholder="Název nebo inventární číslo"
                            value={pageState.searchTerm}
                            onChange={(e) => updatePageState({ searchTerm: e.target.value, currentPage: 0 })}
                            style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 16, color: 'var(--fg)' }}
                        />
                        {pageState.searchTerm ? (
                            <button
                                type="button"
                                aria-label="Vymazat hledání"
                                onClick={() => updatePageState({ searchTerm: "", currentPage: 0 })}
                                style={{ border: "none", background: "none", cursor: "pointer", padding: 4, display: "flex" }}
                            >
                                <span className="material-icons-round" style={{ fontSize: 18, color: "var(--muted)" }}>close</span>
                            </button>
                        ) : null}
                    </label>
                    <button
                        type="button"
                        aria-label="Hledat podle QR kódu"
                        onClick={() => setIsQRModalOpen(true)}
                        style={{ width: 48, borderRadius: 16, border: "none", background: "var(--ink-soft)", color: "var(--on-ink)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    >
                        <span className="material-icons-round" style={{ fontSize: 22 }}>qr_code_scanner</span>
                    </button>
                </div>

                <UserLocationPicker onChange={handleLocationChange} />

                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: -4 }}>
                    {statusLine}
                    {searchTerm && !inventuraId ? " · vyberte aktivní inventuru, abyste mohli předměty přidávat" : ""}
                    {!searchTerm && inventuraId ? " · napište název nebo číslo a uvidíte, co už je v inventuře" : ""}
                </div>

                {addedName ? (
                    <div role="status" style={{ borderRadius: 12, background: "var(--st-ok-bg)", color: "var(--ok)", padding: "10px 12px", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="material-icons-round" style={{ fontSize: 18 }}>check_circle</span>
                        <span style={{ flex: 1, minWidth: 0 }}>Přidáno do inventury: {addedName}</span>
                        <button type="button" aria-label="Zavřít" onClick={() => setAddedName("")} style={{ border: "none", background: "none", cursor: "pointer", display: "flex" }}>
                            <span className="material-icons-round" style={{ fontSize: 18, color: "var(--ok)" }}>close</span>
                        </button>
                    </div>
                ) : null}

                {!online ? (
                    <div style={{ borderRadius: 12, background: "var(--surface-2)", padding: "10px 12px", fontSize: 14, display: "flex", gap: 8, alignItems: "center" }}>
                        <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 18 }}>cloud_off</span>
                        Bez signálu nejde prohledávat evidenci majetku ani zakládat předměty.
                    </div>
                ) : error ? (
                    <div>Chyba: {error.message}</div>
                ) : null}
                <div className="flex flex-col gap-2">
                    {loading && items.length === 0 ? (
                        isGrid ? <div className="grid grid-cols-2 gap-4 auto-rows-fr">{skeletons("skeleton")}</div> : skeletons("skeleton")
                    ) : isGrid ? (
                        <>
                            <div className="grid grid-cols-2 gap-4 auto-rows-fr">{items.map((item) => renderCard(item, false))}</div>
                            {loading && items.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4 auto-rows-fr mt-4">{skeletons("append-skel")}</div>
                            ) : null}
                        </>
                    ) : (
                        <>
                            {items.map((item) => renderCard(item, isCompact))}
                            {loading && items.length > 0 ? skeletons("append-skel") : null}
                        </>
                    )}
                </div>
                <Pagination
                    variant="feed"
                    total={total}
                    pageSize={pageSize}
                    highlightPage1Based={highlightPage1Based}
                    loading={loading}
                    onPageSelect1Based={goToPage1Based}
                    onAppendNext={appendNextChunk}
                    canAppendMore={canAppendMore}
                    appendNextLabel={`Načíst dalších ${pageSize}`}
                />

                {newItemUrl && online ? (
                    <div style={{ borderRadius: 16, border: "1px dashed var(--line)", padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ fontSize: 14, color: "var(--fg)" }}>
                            <b>Předmět v evidenci není?</b> Založte nový.
                            {lastScannedQr ? ` Kód ${lastScannedQr} z posledního skenu se vyplní sám.` : ""}
                        </div>
                        <Button icon="add" iconPosition="right" onClick={() => router.push(newItemUrl)}>
                            Založit nový předmět
                        </Button>
                    </div>
                ) : null}

                <SortOptionsModal
                    isOpen={isOptionsModalOpen}
                    onClose={() => setIsOptionsModalOpen(false)}
                    sortOptions={sortOptions}
                    initialSortBy={pageState.sortBy}
                    initialSortOrder={pageState.sortOrder}
                    onChange={({ sortBy: newSortBy, sortOrder: newSortOrder }) => {
                        updatePageState({ sortBy: newSortBy, sortOrder: newSortOrder, currentPage: 0 });
                    }}
                />
                <QRScannerModal isOpen={isQRModalOpen} onClose={() => setIsQRModalOpen(false)} onScan={handleScan} validate={false} />

                <AddToInventoryModal
                    baseItem={addItem}
                    eventId={inventuraId}
                    onClose={() => setAddItem(null)}
                    onAdded={(baseItem, created) => {
                        membership.markAdded(baseItem, created);
                        setAddItem(null);
                        setAddedName(baseItem?.name || "Předmět");
                    }}
                />
            </div>
        </main>
    );
}
