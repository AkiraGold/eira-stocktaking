import React from "react";
import StateBadge from "@/components/atoms/StateBadge";
import {
    INVENTORY_STATES,
    INVENTORY_STATE_META,
    isFoundState,
    isMovedState,
    isNewState,
    isNotFoundState,
} from "@/utils/inventoryStates";

const OPTIONS = [
    { key: INVENTORY_STATES.FOUND, action: "found" },
    { key: INVENTORY_STATES.NOT_FOUND, action: "notFound" },
    { key: INVENTORY_STATES.MOVED, action: "move" },
];

/**
 * Přepínač stavu v detailu předmětu: Nalezeno / Nenalezeno / Přesun.
 * Přesun otevře výběr místnosti, ostatní se uloží hned.
 * U předmětu ve stavu Nový zůstává stav Nový (viz resolveStateForUpdate), nabízí se jen přesun.
 */
export default function InventoryStateSwitch({ state, onMarkFound, onMarkNotFound, onMove, disabled = false }) {
    const isNew = isNewState(state);
    const isActive = (key) =>
        key === INVENTORY_STATES.FOUND
            ? isFoundState(state)
            : key === INVENTORY_STATES.MOVED
                ? isMovedState(state)
                : isNotFoundState(state);
    const handlers = { found: onMarkFound, notFound: onMarkNotFound, move: onMove };
    const options = isNew ? OPTIONS.filter((o) => o.action === "move") : OPTIONS;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                Stav v inventuře
                <StateBadge state={state} />
            </div>
            <div
                role="radiogroup"
                aria-label="Stav v inventuře"
                style={{ display: "flex", gap: 4, padding: 4, borderRadius: 14, background: "var(--surface-2)" }}
            >
                {options.map(({ key, action }) => {
                    const meta = INVENTORY_STATE_META[key];
                    const active = isActive(key);
                    return (
                        <button
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={disabled}
                            onClick={() => {
                                if (active && action !== "move") return;
                                handlers[action]?.();
                            }}
                            style={{
                                flex: 1,
                                minHeight: 40,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 4,
                                border: "none",
                                borderRadius: 10,
                                background: active ? meta.color : "transparent",
                                color: active ? "var(--accent-ink)" : meta.color,
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: disabled ? "default" : "pointer",
                                boxShadow: active ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
                            }}
                        >
                            <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 16 }}>
                                {meta.icon}
                            </span>
                            {meta.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
