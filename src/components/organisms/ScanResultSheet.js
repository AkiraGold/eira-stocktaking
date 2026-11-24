"use client";

import React from "react";
import Button from "@/components/atoms/Button";
import CardItemName from "@/components/atoms/CardItemName";
import StateBadge from "@/components/atoms/StateBadge";
import LocationPicker from "@/components/organisms/LocationPicker";
import { getEffectiveInvNumber } from "@/utils/inventoryStates";

function resolveImageSrc(image) {
    if (!image) return null;
    if (/^data:image\//.test(image)) return image;
    if (/^[A-Za-z0-9+/=]+$/.test(image) && image.length > 100) return `data:image/*;base64,${image}`;
    return image;
}

const TITLES = {
    confirm: { text: "Předmět patří do této místnosti", color: "var(--ok)", icon: "qr_code_scanner" },
    checked: { text: "Předmět už je zkontrolovaný", color: "var(--muted)", icon: "task_alt" },
    move: { text: "Předmět je podle evidence jinde", color: "var(--st-mv)", icon: "wrong_location" },
    done: { text: "Uloženo", color: "var(--ok)", icon: "check_circle" },
};

/**
 * Spodní panel s výsledkem skenu. Nahrazuje modální okna, skener zůstává vidět nad ním.
 * kind: confirm | checked | move | done
 */
export default function ScanResultSheet({
    sheet,
    onMarkFound,
    onMoveHere,
    onMoveElsewhere,
    onEdit,
    onUndo,
    onClose,
}) {
    const open = Boolean(sheet);
    const item = sheet?.item;
    const meta = sheet ? TITLES[sheet.kind] : null;
    const img = resolveImageSrc(item?.image);
    const invNumber = item ? getEffectiveInvNumber(item) : null;

    return (
        <div
            role="dialog"
            aria-live="polite"
            aria-label="Výsledek skenu"
            style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 220,
                background: 'var(--surface)',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                boxShadow: "0 -12px 48px rgba(0,0,0,0.18), 0 -1px 0 rgba(0,0,0,0.06)",
                padding: "14px 16px max(16px, env(safe-area-inset-bottom))",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                transform: open ? "translate3d(0,0,0)" : "translate3d(0, calc(100% + 20px), 0)",
                transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
                pointerEvents: open ? "auto" : "none",
            }}
        >
            {sheet && item ? (
                <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: meta.color, fontWeight: 700, fontSize: 14 }}>
                            <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 20 }}>
                                {meta.icon}
                            </span>
                            {sheet.kind === "done" && sheet.message ? sheet.message : meta.text}
                        </div>
                        <button
                            type="button"
                            aria-label="Zavřít"
                            onClick={onClose}
                            style={{ border: "none", background: "var(--surface-2)", borderRadius: 999, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                        >
                            <span className="material-icons-round" style={{ fontSize: 18 }}>close</span>
                        </button>
                    </div>

                    <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                        <div
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: 12,
                                background: "var(--surface-2)",
                                flexShrink: 0,
                                overflow: "hidden",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {img ? (
                                <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <span className="material-icons-round" style={{ fontSize: 28, color: "var(--muted)" }}>inventory_2</span>
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                <CardItemName>{item.name}</CardItemName>
                            </div>
                            {invNumber ? <div style={{ fontSize: 12, color: "var(--muted)" }}>Inv. č. {invNumber}</div> : null}
                            <StateBadge state={item.state} />
                        </div>
                    </div>

                    {sheet.kind === "move" ? (
                        <div style={{ borderRadius: 14, background: "var(--st-mv-bg)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                            <LocationPicker value={item.location} label="Podle evidence:" editMode={false} />
                            <LocationPicker value={sheet.loc} label="Jsem v:" editMode={false} />
                        </div>
                    ) : null}

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {sheet.kind === "confirm" ? (
                            <Button icon="check" iconPosition="right" onClick={onMarkFound}>
                                Označit jako nalezeno
                            </Button>
                        ) : null}
                        {sheet.kind === "move" ? (
                            <>
                                <Button icon="move_down" iconPosition="right" onClick={onMoveHere}>
                                    Nalezeno, přesunout sem
                                </Button>
                                <Button variant="secondary" icon="swap_horiz" iconPosition="right" onClick={onMoveElsewhere}>
                                    Jiná místnost…
                                </Button>
                            </>
                        ) : null}
                        {sheet.kind === "done" && sheet.undo ? (
                            <Button variant="secondary" icon="undo" iconPosition="right" onClick={onUndo}>
                                Vrátit zpět
                            </Button>
                        ) : null}
                        {sheet.kind === "checked" || sheet.kind === "confirm" ? (
                            <Button variant="secondary" icon="edit" iconPosition="right" onClick={onEdit}>
                                Upravit
                            </Button>
                        ) : null}
                        {sheet.kind !== "done" ? (
                            <Button variant="secondary" icon="close" iconPosition="right" onClick={onClose}>
                                {sheet.kind === "checked" ? "Skenovat další" : "Storno"}
                            </Button>
                        ) : null}
                    </div>
                </>
            ) : null}
        </div>
    );
}
