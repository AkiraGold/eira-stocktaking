import React from "react";
import { getInventoryStateMeta } from "@/utils/inventoryStates";

/** Stav inventury jako štítek s ikonou a textem. Neznámý stav se nezobrazí. */
export default function StateBadge({ state }) {
    const meta = getInventoryStateMeta(state);
    if (!meta) return null;
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                alignSelf: "flex-start",
                padding: "2px 8px 2px 6px",
                borderRadius: 999,
                background: meta.bg,
                color: meta.color,
                border: `1px solid ${meta.color}33`,
                fontSize: 12,
                fontWeight: 700,
                lineHeight: "18px",
                whiteSpace: "nowrap",
            }}
        >
            <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 14 }}>
                {meta.icon}
            </span>
            {meta.label}
        </span>
    );
}
