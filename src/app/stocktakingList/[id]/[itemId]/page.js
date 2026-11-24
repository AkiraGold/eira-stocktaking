"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useStocktakingItem, useUpdateInventoryObject, useDeleteInventoryObject, useDuplicateInventoryObject } from "@/hooks/useStocktakingItems";
import CenteredModal from "@/components/molecules/CenteredModal";
import ActionFeedbackModal from "@/components/molecules/ActionFeedbackModal";
import ActionLoadingModal from "@/components/molecules/ActionLoadingModal";
import SwipeToDelete from "@/components/molecules/SwipeToDelete";
import DuplicateIdentifierModal from "@/components/molecules/DuplicateIdentifierModal";
import { useDuplicateItemModal } from "@/hooks/useDuplicateItemModal";
import { useGetLocation } from "@/hooks/useLocation";
import { mapLocationToApi } from "@/utils/inventoryItemApi";
import StocktakingItemDetailTemplate from "@/components/organisms/StocktakingItemDetailTemplate";
import Button from '@/components/atoms/Button';
import LocationPicker from "@/components/organisms/LocationPicker";
import CardItemName from "@/components/atoms/CardItemName";
import { INVENTORY_STATES, resolveStateForMove, resolveStateForUpdate } from "@/utils/inventoryStates";
import { buildStocktakingItemUrl, buildStocktakingListUrl, HOME_PATH } from "@/utils/inventoryNavigation";
import PageLoadingScreen from "@/components/atoms/PageLoadingScreen";
import UndoToast from "@/components/molecules/UndoToast";


export default function StocktakingListItemDetail() {
    const params = useParams();
    const router = useRouter();
    const stocktakingId = parseInt(params.id);
    const itemId = parseInt(params.itemId);
    const searchParams = useSearchParams();
    const returnTo =
        searchParams.get("returnTo") ||
        buildStocktakingListUrl(stocktakingId, { returnTo: HOME_PATH });
    const wantEdit = searchParams.get('edit') === '1';
    const [editMode, setEditMode] = useState(wantEdit);
    const [prevWantEdit, setPrevWantEdit] = useState(wantEdit);

    const [editItem, setEditItem] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [moveNewLocation, setMoveNewLocation] = useState(null);
    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
    const bottomBarRef = useRef(null);
    const attachmentsRef = useRef(null);
    const [bottomPadding, setBottomPadding] = useState(0);
    const [barRendered, setBarRendered] = useState(false);
    const [prevEditMode, setPrevEditMode] = useState(editMode);

    const getLocation = useGetLocation();

    const [fetchedItem, loading, error, refetchItem] = useStocktakingItem(itemId, stocktakingId);
    const [prevFetchedItem, setPrevFetchedItem] = useState(fetchedItem);
    const { updateItem, loading: updateLoading, error: updateError, success: updateSuccess } = useUpdateInventoryObject(stocktakingId);
    const { deleteItem, loading: deleteLoading, error: deleteError, success: deleteSuccess } = useDeleteInventoryObject(stocktakingId);
    const { duplicateItem, loading: duplicateLoading } = useDuplicateInventoryObject(stocktakingId);
    const duplicateModal = useDuplicateItemModal(duplicateItem);

    const [actionModalOpen, setActionModalOpen] = useState(false);
    const [actionModalContent, setActionModalContent] = useState({ title: '', message: '', success: false });
    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);
    const [noteSaving, setNoteSaving] = useState(false);

    const showToast = (next) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast(next);
        toastTimerRef.current = setTimeout(() => setToast(null), next?.undoable ? 6000 : 2500);
    };
    useEffect(() => () => toastTimerRef.current && clearTimeout(toastTimerRef.current), []);

    const originalImageRef = useRef(null);
    useEffect(() => {
        if (fetchedItem) {
            originalImageRef.current = fetchedItem.image || null;
        }
    }, [fetchedItem]);

    if (fetchedItem !== prevFetchedItem) {
        setPrevFetchedItem(fetchedItem);
        if (fetchedItem) {
            const mappedLoc = fetchedItem.location
                ? {
                    building: fetchedItem.location.building,
                    storey: fetchedItem.location.storey,
                    room: fetchedItem.location.room,
                }
                : null;
            setEditItem({ ...fetchedItem, location: mappedLoc });
        }
    }

    if (wantEdit !== prevWantEdit) {
        setPrevWantEdit(wantEdit);
        if (wantEdit) setEditMode(true);
    }

    if (editMode && editItem && !editItem.location) {
        const userLoc = getLocation();
        if (userLoc) {
            setEditItem({ ...editItem, location: userLoc });
        }
    }

    if (editMode !== prevEditMode) {
        setPrevEditMode(editMode);
        if (!editMode) setBarRendered(false);
    }

    useEffect(() => {
        if (editMode && barRendered && bottomBarRef.current) {
            setBottomPadding(bottomBarRef.current.offsetHeight);
        }
    }, [editMode, barRendered]);

    const isAnyLoading = updateLoading || deleteLoading || duplicateLoading;

    const showActionModal = (title, message, success) => {
        setActionModalContent({ title, message, success });
        setActionModalOpen(true);
    };

    // Opětovné načtení po uložení nemá překrýt obrazovku načítáním.
    if (loading && !fetchedItem) return <PageLoadingScreen />;
    if (error && !fetchedItem) return <PageLoadingScreen message={`Chyba: ${error.message}`} />;
    if (!fetchedItem) return <PageLoadingScreen message="Položka nenalezena" />;

    const item = { ...fetchedItem, location: editItem?.location };

    /** Změna stavu z přepínače: uloží se hned a krátce nabídne Vrátit zpět. */
    const changeState = async (target, message, errorMessage) => {
        if (!item) return;
        const prev = { state: item.state, location: item.location };
        const { image, ...rest } = item;
        const result = await updateItem({ ...rest, stocktakingId, state: resolveStateForUpdate(target, item.state) });
        if (result) {
            showToast({ message, undoable: true, prev });
            if (refetchItem) refetchItem();
        } else {
            showActionModal('Chyba', errorMessage, false);
        }
    };

    const handleMarkFound = () =>
        changeState(INVENTORY_STATES.FOUND, 'Označeno jako nalezeno', 'Nepodařilo se označit položku jako nalezenou.');

    const handleMarkNotFound = () =>
        changeState(INVENTORY_STATES.NOT_FOUND, 'Označeno jako nenalezeno', 'Nepodařilo se označit položku jako nenalezenou.');

    const handleUndo = async () => {
        const prev = toast?.prev;
        if (!prev || !item) return;
        setToast((t) => (t ? { ...t, undoing: true } : t));
        const { image, ...rest } = item;
        const result = await updateItem({
            ...rest,
            stocktakingId,
            state: prev.state,
            location: prev.location ? mapLocationToApi(prev.location) : rest.location,
        });
        if (result) {
            showToast({ message: 'Změna vrácena' });
            if (refetchItem) refetchItem();
        } else {
            setToast(null);
            showActionModal('Chyba', 'Změnu se nepodařilo vrátit.', false);
        }
    };

    const handleSaveNote = async (note) => {
        if (!item) return;
        setNoteSaving(true);
        try {
            const { image, ...rest } = item;
            const result = await updateItem({ ...rest, stocktakingId, note, state: resolveStateForUpdate(item.state, item.state) });
            if (result) {
                showToast({ message: 'Poznámka uložena' });
                if (refetchItem) refetchItem();
            } else {
                showActionModal('Chyba', 'Poznámku se nepodařilo uložit.', false);
            }
        } finally {
            setNoteSaving(false);
        }
    };

    const handleMoveConfirm = async () => {
        if (!item || !moveNewLocation) return;
        const { image, ...rest } = item;
        const prev = { state: item.state, location: item.location };
        const result = await updateItem({ ...rest, stocktakingId, location: mapLocationToApi(moveNewLocation), state: resolveStateForMove(item.state) });
        setIsMoveModalOpen(false);
        if(result) {
            showToast({ message: 'Předmět přesunut', undoable: true, prev });
            if (refetchItem) refetchItem();
        } else {
            showActionModal('Chyba', 'Nepodařilo se přesunout položku.', false);
        }
    };

    const openMoveModal = () => {
        setMoveNewLocation(item.location);
        setIsMoveModalOpen(true);
    };

    const handleSave = async () => {
        if (!editItem) return;

        const origImage = originalImageRef.current ?? null;
        const curImage = editItem.image ?? null;
        const imageChanged = curImage !== origImage;

        const mainData = {
            id: editItem.id,
            stocktakingId: stocktakingId,
            description: editItem.description,
            note: editItem.note,
            qr: editItem.qr,
            lastCheck: editItem.date || editItem.lastCheck || null,
            state: resolveStateForUpdate(editItem.state, fetchedItem?.state ?? item.state),
            location: mapLocationToApi(editItem.location),
        };
        mainData.imgChanged = imageChanged;
        if (imageChanged) {
            mainData.image = editItem.image;
        }

        const result = await updateItem(mainData);
        if (result) {
            try {
                await attachmentsRef.current?.commitPending?.();
            } catch (e) {
                showActionModal('Chyba', e?.message || 'Přílohy se nepodařilo uložit.', false);
                return;
            }
            setEditMode(false);
            showActionModal('Hotovo', 'Položka byla úspěšně upravena.', true);
            if (refetchItem) refetchItem();
        } else {
            showActionModal('Chyba', 'Nepodařilo se upravit položku.', false);
        }
    };

    const handleCancelEdit = () => {
        setEditMode(false);
    };

    const handleDuplicateConfirm = async (code) => {
        const { ok, newId } = await duplicateModal.confirm(code, item?.id);
        if (newId) {
            showActionModal('Hotovo', 'Položka byla úspěšně duplikována.', true);
            router.push(buildStocktakingItemUrl(stocktakingId, newId, { returnTo }));
        } else if (ok) {
            showActionModal('Hotovo', 'Položka byla úspěšně duplikována.', true);
        } else {
            showActionModal('Chyba', 'Nepodařilo se duplikovat položku.', false);
        }
    };

    const handleDelete = async () => {
        if (!editItem) return;
        const result = await deleteItem(editItem.id);
        if(result) {
            showActionModal('Hotovo', 'Položka byla úspěšně smazána.', true);
        } else {
            showActionModal('Chyba', 'Nepodařilo se smazat položku.', false);
        }
    };

    return (
        <>
            <StocktakingItemDetailTemplate
                item={item}
                editItem={editItem}
                editMode={editMode}
                onEditItemChange={setEditItem}
                onEditModeChange={() => setEditMode(!editMode)}
                onDelete={() => setIsDeleteModalOpen(true)}
                onDuplicate={duplicateModal.open}
                onSave={handleSave}
                onMove={openMoveModal}
                onMarkFound={handleMarkFound}
                onMarkNotFound={handleMarkNotFound}
                showMove={true}
                showFoundActions={true}
                loading={loading && !fetchedItem}
                error={fetchedItem ? null : error}
                onSaveNote={handleSaveNote}
                noteSaving={noteSaving}
                returnTo={returnTo}
                isDeleteModalOpen={isDeleteModalOpen}
                setIsDeleteModalOpen={setIsDeleteModalOpen}
                bottomPadding={bottomPadding}
                setBottomPadding={setBottomPadding}
                barRendered={barRendered}
                setBarRendered={setBarRendered}
                attachmentsRef={attachmentsRef}
            />
            <ActionFeedbackModal
                isOpen={actionModalOpen}
                onClose={() => setActionModalOpen(false)}
                title={actionModalContent.title}
                message={actionModalContent.message}
                success={actionModalContent.success}
            />
            <ActionLoadingModal isOpen={isAnyLoading && !noteSaving} />
            <UndoToast toast={toast} onUndo={handleUndo} onClose={() => setToast(null)} />
            <DuplicateIdentifierModal
                isOpen={duplicateModal.isOpen}
                onClose={duplicateModal.close}
                originalCode={item?.qr}
                onConfirm={handleDuplicateConfirm}
                loading={duplicateLoading}
            />
            <CenteredModal title={"Opravdu chcete smazat předmět?"} isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ fontSize: 12, fontStyle: 'italic' }}>Tuto operaci nelze vrátit!</div>
                    <SwipeToDelete onConfirm={async () => {
                        setIsDeleteModalOpen(false);
                        await handleDelete();
                    }} />
                </div>
            </CenteredModal>
            <CenteredModal isOpen={isMoveModalOpen} onClose={() => setIsMoveModalOpen(false)} title="Přesun položky" disableClickAway={isLocationPickerOpen}>
                {item && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div style={{ color: "var(--info)", fontWeight: 600 }}>
                            Položka bude přesunuta do jiné místnosti
                        </div>
                        <div style={{ borderRadius: 16, background: "var(--surface-2)", overflow: "hidden", display: "flex", flexDirection: "column", width: "100%" }}>
                            {item.image && (
                                <img
                                    src={
                                        /^data:image\//.test(item.image)
                                            ? item.image
                                            : (/^[A-Za-z0-9+/=]+$/.test(item.image) && item.image.length > 100)
                                                ? `data:image/*;base64,${item.image}`
                                                : item.image
                                    }
                                    alt={item.name}
                                    style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }}
                                />
                            )}
                            <div className="p-4 gap-4 flex flex-col">
                                <div>
                                    <CardItemName>{item.name}</CardItemName>
                                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.note}</div>
                                </div>
                                <div style={{ fontStyle: "italic", fontSize: 12, color: "var(--muted)" }}>
                                    Poslední kontrola {item.lastCheck ? new Date(item.lastCheck).toLocaleString() : ""}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
                            <LocationPicker value={item.location} label="Aktuální umístění:" editMode={false} />
                            <span className="material-icons-round" style={{ fontSize: 24, color: 'var(--fg)' }}>arrow_downward</span>
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
                            <Button icon="check" iconPosition="right" onClick={handleMoveConfirm}>
                                Potvrdit změnu lokace
                            </Button>
                            <Button variant="secondary" icon="close" iconPosition="right" onClick={() => setIsMoveModalOpen(false)}>
                                Storno
                            </Button>
                        </div>
                    </div>
                )}
            </CenteredModal>
            {editMode && (
                <div
                    ref={el => {
                        bottomBarRef.current = el;
                        if (el) {
                            setBarRendered(true);
                        }
                    }}
                    className="fixed left-0 right-0 bottom-0 z-[100] backdrop-blur-md flex justify-center"
                    style={{
                        background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 20%)',
                    }}
                >
                    <div className="container flex items-center gap-2 p-4 justify-center">
                        <Button variant="secondary" icon="close" iconPosition="right" style={{ fontSize: "0.75rem" }} onClick={handleCancelEdit}>
                            Zrušit úpravy
                        </Button>
                        <Button icon="check" iconPosition="right" style={{ fontSize: "0.75rem" }} onClick={handleSave}>
                            Uložit změny
                        </Button>
                    </div>
                </div>
            )}

        </>
    );
} 