import { useEffect, useState } from "react";
import { getAuthHeadersSafe } from "@/utils/token";
import {
    INVENTORY_STATES,
    INVENTORY_STATES_WITHOUT_UNCHECKED,
    INVENTORY_DISPLAY_MODE,
} from "@/utils/inventoryStates";

async function countItems(eventId, states, location) {
    const res = await fetch("/api/objects/feed", {
        method: "POST",
        headers: getAuthHeadersSafe(),
        body: JSON.stringify({
            eventId,
            page: 0,
            limit: 1,
            sortBy: "id",
            sortOrder: "asc",
            search: "",
            state: states,
            hasNote: [],
            roomId: location?.room || null,
            storeyId: location?.storey || null,
            buildingId: location?.building || null,
        }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const total = Number(data?.total);
    return Number.isFinite(total) && total >= 0 ? total : 0;
}

/**
 * Počty předmětů inventury podle stavu (pro Přehled) a postup v aktuální místnosti.
 * V režimu Pracovní se nezjišťuje, kolik předmětů se očekává (Nezkontrolováno).
 */
export function useInventuraProgress(eventId, location, displayMode) {
    const room = location?.room || null;
    const storey = location?.storey || null;
    const building = location?.building || null;
    const depsKey = `${eventId ?? ""}|${displayMode}|${room}|${storey}|${building}`;

    const [progress, setProgress] = useState(() => ({
        loading: Boolean(eventId),
        error: null,
        byState: {},
        room: null,
    }));
    const [prevDepsKey, setPrevDepsKey] = useState(depsKey);

    if (depsKey !== prevDepsKey) {
        setPrevDepsKey(depsKey);
        if (!eventId) {
            setProgress({ loading: false, error: null, byState: {}, room: null });
        } else {
            setProgress((p) => ({ ...p, loading: true, error: null }));
        }
    }

    useEffect(() => {
        if (!eventId) return;
        let cancelled = false;
        const workflow = displayMode === INVENTORY_DISPLAY_MODE.WORKFLOW;
        const states = workflow ? INVENTORY_STATES_WITHOUT_UNCHECKED : [...INVENTORY_STATES_WITHOUT_UNCHECKED, INVENTORY_STATES.UNCHECKED];
        const loc = room || storey || building ? { room, storey, building } : null;

        (async () => {
            await Promise.resolve();
            if (cancelled) return;
            try {
                const counts = await Promise.all(states.map((s) => countItems(eventId, [s], null)));
                const byState = Object.fromEntries(states.map((s, i) => [s, counts[i]]));
                let roomProgress = null;
                if (loc) {
                    const checked = await countItems(eventId, INVENTORY_STATES_WITHOUT_UNCHECKED, loc);
                    const unchecked = workflow ? null : await countItems(eventId, [INVENTORY_STATES.UNCHECKED], loc);
                    roomProgress = { checked, total: unchecked == null ? null : checked + unchecked };
                }
                if (!cancelled) setProgress({ loading: false, error: null, byState, room: roomProgress });
            } catch (error) {
                if (!cancelled) setProgress({ loading: false, error, byState: {}, room: null });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [eventId, displayMode, room, storey, building]);

    return progress;
}
