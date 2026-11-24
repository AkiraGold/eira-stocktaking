import React from "react";
import {
    INVENTORY_STATES,
    INVENTORY_STATE_FILTER_ORDER,
    INVENTORY_STATE_META,
} from "@/utils/inventoryStates";

function chipStyle(active, color) {
    return {
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        minHeight: 36,
        padding: "6px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--fg)" : "var(--line)"}`,
        background: active ? "var(--fg)" : "var(--surface)",
        color: active ? "var(--accent-ink)" : color,
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: "nowrap",
        cursor: "pointer",
    };
}

/**
 * Rychlý filtr podle stavu. Funguje stejně jako zaškrtávání stavů v okně Filtry
 * (lze vybrat více stavů), ale platí okamžitě. „Vše“ výběr zruší.
 */
export default function StateFilterChips({ value = [], onChange, omitUnchecked = false }) {
    const selected = Array.isArray(value) ? value : [];
    const states = omitUnchecked
        ? INVENTORY_STATE_FILTER_ORDER.filter((s) => s !== INVENTORY_STATES.UNCHECKED)
        : INVENTORY_STATE_FILTER_ORDER;

    const toggle = (state) => {
        const next = selected.includes(state)
            ? selected.filter((s) => s !== state)
            : [...selected, state];
        onChange?.(next);
    };

    return (
        <div
            role="group"
            aria-label="Filtr podle stavu"
            style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}
        >
            <button type="button" aria-pressed={selected.length === 0} onClick={() => onChange?.([])} style={chipStyle(selected.length === 0, "var(--fg)")}>
                Vše
            </button>
            {states.map((state) => {
                const meta = INVENTORY_STATE_META[state];
                const active = selected.includes(state);
                return (
                    <button key={state} type="button" aria-pressed={active} onClick={() => toggle(state)} style={chipStyle(active, meta.color)}>
                        <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 16 }}>{meta.icon}</span>
                        {meta.label}
                    </button>
                );
            })}
        </div>
    );
}
