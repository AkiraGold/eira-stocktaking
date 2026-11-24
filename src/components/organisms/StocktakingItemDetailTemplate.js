import React, { useRef, useLayoutEffect, useState } from "react";
import PictureInput from "@/components/molecules/PictureInput";
import CardContainer from "@/components/atoms/CardContainer";
import DetailCardRow from "@/components/atoms/DetailCardRow";
import { ContextButton, ContextRow } from "@/components/molecules/ContextMenu";
import NavBackLink from "@/components/molecules/NavBackLink";
import { HOME_PATH } from "@/utils/inventoryNavigation";
import LocationPicker from "@/components/organisms/LocationPicker";
import QRCodeInput from "@/components/molecules/QRCodeInput";
import TextInput from "@/components/atoms/TextInput";
import ItemPropertyEditor from "@/components/molecules/ItemPropertyEditor";
import ItemAttachmentsSection from "@/components/molecules/ItemAttachmentsSection";
import { buildInventoryStateContextRows } from "@/components/molecules/InventoryStateContextRows";
import PageLoadingScreen from "@/components/atoms/PageLoadingScreen";
import InventoryStateSwitch from "@/components/molecules/InventoryStateSwitch";

function formatCheck(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Kdo předmět naposledy zkontroloval, pokud to API posílá (název pole zatím není jisté). */
function resolveCheckedBy(item) {
  return item?.lastCheckBy || item?.checkedBy || item?.lastCheckUser || item?.modifiedBy || "";
}

/** Poznámka k inventuře upravitelná přímo v detailu, bez přepnutí do režimu Upravit. */
function InlineNote({ value, onSave, saving }) {
  const [draft, setDraft] = useState(value || "");
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value || "");
  }
  const dirty = (draft || "") !== (value || "");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <TextInput
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        label="Poznámka k inventuře"
        placeholder="Napište poznámku…"
        multiline
      />
      {dirty ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setDraft(value || "")}
            style={{ flex: 1, minHeight: 40, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface-2)", fontWeight: 600, cursor: "pointer" }}
          >
            Zrušit
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave?.(draft)}
            style={{ flex: 2, minHeight: 40, borderRadius: 12, border: "none", background: "var(--ink-soft)", color: "var(--on-ink)", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Ukládám…" : "Uložit poznámku"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

const detailActionStyle = {
  flex: 1,
  minHeight: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  borderRadius: 12,
  border: '1px solid var(--line)',
  background: 'var(--surface-2)',
  color: 'var(--fg)',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
};

export default function StocktakingItemDetailTemplate({
  item,
  editItem,
  editMode,
  onEditItemChange,
  onEditModeChange,
  onDelete,
  onDuplicate,
  onSave,
  onMove,
  onMarkFound,
  onMarkNotFound,
  showMove = false,
  showFoundActions = false,
  loading,
  error,
  returnTo = HOME_PATH,
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  bottomPadding = 0,
  setBottomPadding,
  barRendered,
  setBarRendered,
  showInventoryDetails = true,
  attachmentsRef = null,
  onSaveNote,
  noteSaving = false,
}) {
  /** Detail předmětu v inventuře má nový vzhled (krok 4); detail v Majetku zůstává. */
  const inventoryLayout = showFoundActions && showInventoryDetails;
  const bottomBarRef = useRef(null);
  useLayoutEffect(() => {
    if (editMode && barRendered && bottomBarRef.current && setBottomPadding) {
      setBottomPadding(bottomBarRef.current.offsetHeight);
    }
  }, [editMode, barRendered, setBottomPadding]);

  if (loading) return <PageLoadingScreen />;
  if (error) return <PageLoadingScreen message={`Chyba: ${error.message}`} />;
  if (!item) return <PageLoadingScreen message="Položka nenalezena" />;

  return (
    <div className="relative min-h-screen flex flex-col">
      <main className="flex flex-col items-center" style={{ minHeight: "100vh", paddingBottom: bottomPadding }}>
        <div className="flex flex-col container">
          <NavBackLink returnTo={returnTo} />
          {editMode ? (
            <>
              {editItem && (
                <>
                  <PictureInput
                    value={editItem.image || ""}
                    itemId={editItem.id}
                    editMode={true}
                    onChange={(img) => onEditItemChange({ ...editItem, image: img })}
                  />
                  <div className="p-4 flex flex-col gap-4">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--fg)' }}>{editItem.name}</span>
                      </div>
                      <TextInput
                        value={editItem.description}
                        onChange={e => onEditItemChange({ ...editItem, description: e.target.value })}
                        label={"Popisek"}
                        placeholder="Popisek"
                      />
                    </div>
                    <div style={{ width: '100%', height: 2, background: 'var(--surface-2)' }} />
                  {showInventoryDetails && (
                    <TextInput
                      value={editItem.note}
                      onChange={e => onEditItemChange({ ...editItem, note: e.target.value })}
                      label={"Poznámka k inventuře"}
                      placeholder="Poznámka k inventuře"
                      multiline
                    />
                  )}
                  <LocationPicker
                    value={editItem.location}
                    editMode={false}
                  />
                    <QRCodeInput
                      value={editItem.qr}
                      onChange={code => onEditItemChange({ ...editItem, qr: code })}
                      editMode={false}
                    />
                    {editItem.properties && Array.isArray(editItem.properties) && editItem.properties.length > 0 && (
                      <CardContainer className="gap-2">
                        {editItem.properties
                          .sort((a, b) => (a.priority || 0) - (b.priority || 0)) // Sort by priority
                          .map((prop, index) => {
                            const label = prop.label || prop.key || `Vlastnost ${index + 1}`;
                            const value = prop.value || '';
                            const key = prop.metaCode || prop.key || `prop_${index}`;
                            
                            return (
                              <DetailCardRow key={key} label={label + ':'} value={value} />
                            );
                          })}
                      </CardContainer>
                    )}
                    <ItemAttachmentsSection ref={attachmentsRef} rmId={editItem.id} editMode={true} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontStyle: 'italic', color: 'var(--muted)' }}>
                  {showInventoryDetails && <div>Poslední úprava {editItem.lastCheck || editItem.date}</div>}
                      <div>ID {editItem.id}</div>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <PictureInput value={item.image || ""} itemId={item.id} editMode={false} />
              <div className="p-4 flex flex-col gap-4">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--fg)' }}>{item.name}</span>
                    {inventoryLayout ? null : (
                    <ContextButton>
                      <ContextRow
                        icon="edit"
                        label="Upravit"
                        action={onEditModeChange}
                      />
                      <ContextRow
                        icon="content_copy"
                        label="Duplikovat"
                        action={onDuplicate}
                      />
                      <ContextRow
                        icon="delete"
                        label="Smazat"
                        action={onDelete}
                        color="var(--danger)"
                      />
                      {showMove && (
                        <ContextRow
                          icon="swap_horiz"
                          label="Přesun"
                          action={onMove}
                        />
                      )}
                      {showFoundActions
                        ? buildInventoryStateContextRows({
                            state: item.state,
                            onMarkFound,
                            onMarkNotFound,
                          })
                        : null}
                    </ContextButton>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.description}</div>
                </div>
                {inventoryLayout ? (
                  <>
                    <InventoryStateSwitch
                      state={item.state}
                      onMarkFound={onMarkFound}
                      onMarkNotFound={onMarkNotFound}
                      onMove={onMove}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
                      <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 16 }}>schedule</span>
                      {item.lastCheck
                        ? `Kontrola ${formatCheck(item.lastCheck)}${resolveCheckedBy(item) ? ` · ${resolveCheckedBy(item)}` : ''}`
                        : 'Zatím nezkontrolováno'}
                    </div>
                    <InlineNote value={item.note} onSave={onSaveNote} saving={noteSaving} />
                  </>
                ) : null}
                <div style={{ width: '100%', height: 2, background: 'var(--surface-2)' }} />
                {showInventoryDetails && !inventoryLayout && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--muted)' }}>
                    <div style={{ fontWeight: 500, fontSize: 12 }}>Poznámka k inventuře:</div>
                    <div style={{ fontStyle: 'italic', fontSize: 12 }}>{item.note}</div>
                  </div>
                )}
                <LocationPicker
                  value={item.location}
                  editMode={false}
                />
                <QRCodeInput
                  value={item.qr}
                  editMode={false}
                />
                                 {item.properties && Array.isArray(item.properties) && item.properties.length > 0 && (
                   <CardContainer className="gap-2">
                     {item.properties
                       .sort((a, b) => (a.priority || 0) - (b.priority || 0)) // Sort by priority
                       .map((prop, index) => {
                         const label = prop.label || prop.key || `Vlastnost ${index + 1}`;
                         const value = prop.value || '';
                         const key = prop.metaCode || prop.key || `prop_${index}`;
                         
                         return (
                           <DetailCardRow key={key} label={label + ':'} value={value} />
                         );
                       })}
                   </CardContainer>
                 )}
                <ItemAttachmentsSection ref={attachmentsRef} rmId={item.id} editMode={false} />
                {inventoryLayout ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={onEditModeChange} style={detailActionStyle}>
                        <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 18 }}>edit</span>
                        Upravit údaje
                      </button>
                      <button type="button" onClick={onDuplicate} style={detailActionStyle}>
                        <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 18 }}>content_copy</span>
                        Duplikovat
                      </button>
                    </div>
                  </div>
                ) : null}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontStyle: 'italic', color: 'var(--muted)' }}>
                  {showInventoryDetails && !inventoryLayout && <div>Poslední úprava {item.lastCheck}</div>}
                  <div>ID {item.id}</div>
                </div>
                {inventoryLayout ? (
                  <button
                    type="button"
                    onClick={onDelete}
                    style={{ alignSelf: 'center', marginTop: 8, marginBottom: 16, border: 'none', background: 'none', color: 'var(--danger)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: 8 }}
                  >
                    <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 18 }}>delete</span>
                    Smazat předmět
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
} 