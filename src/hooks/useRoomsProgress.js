import { useEffect, useState } from "react";
import { getAuthHeadersSafe } from "@/utils/token";
import {
    INVENTORY_STATES,
    INVENTORY_STATES_WITHOUT_UNCHECKED,
    isUncheckedState,
} from "@/utils/inventoryStates";

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

async function getJson(path) {
    const res = await fetch(path, { method: "GET", headers: getAuthHeadersSafe() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

/** Spustí úlohy po několika najednou (jen pro katalog místností, ne pro feed). */
async function inBatches(tasks, size = 4) {
    const out = [];
    for (let i = 0; i < tasks.length; i += size) {
        out.push(...(await Promise.all(tasks.slice(i, i + size).map((t) => t()))));
    }
    return out;
}

/**
 * Jednou stáhne předměty inventury v budově a spočítá postup po místnostech.
 * Dřív to dělalo 1–2× POST /objects/feed na každou místnost (~2 s každý) → desítky sekund.
 */
async function fetchBuildingItems(eventId, buildingId, states) {
    const items = [];
    for (let page = 0; page < MAX_PAGES; page++) {
        const res = await fetch("/api/objects/feed", {
            method: "POST",
            headers: getAuthHeadersSafe(),
            body: JSON.stringify({
                eventId,
                page,
                limit: PAGE_SIZE,
                sortBy: "id",
                sortOrder: "asc",
                search: "",
                state: states,
                hasNote: [],
                roomId: null,
                storeyId: null,
                buildingId,
            }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const batch = Array.isArray(data?.items) ? data.items : [];
        items.push(...batch);
        const total = Number(data?.total);
        if (!batch.length || (Number.isFinite(total) && items.length >= total) || batch.length < PAGE_SIZE) {
            break;
        }
    }
    return items;
}

/**
 * Postup po místnostech jedné budovy pro Přehled („Místnosti v inventuře“).
 * Úplný režim: zkontrolováno / celkem, jen místnosti s předměty v inventuře.
 * Pracovní režim: jen počet zkontrolovaných; jen místnosti, kde už něco zkontrolováno je.
 */
export function useRoomsProgress(eventId, buildingId, workflow) {
    const depsKey = `${eventId ?? ""}|${buildingId ?? ""}|${workflow ? 1 : 0}`;
    const [state, setState] = useState(() => ({
        loading: Boolean(eventId && buildingId),
        rooms: [],
        error: null,
    }));
    const [prevDepsKey, setPrevDepsKey] = useState(depsKey);

    if (depsKey !== prevDepsKey) {
        setPrevDepsKey(depsKey);
        if (!eventId || !buildingId) {
            setState({ loading: false, rooms: [], error: null });
        } else {
            setState((s) => ({ ...s, loading: true, error: null }));
        }
    }

    useEffect(() => {
        if (!eventId || !buildingId) return undefined;
        let cancelled = false;
        (async () => {
            await Promise.resolve();
            if (cancelled) return;
            try {
                const states = workflow
                    ? INVENTORY_STATES_WITHOUT_UNCHECKED
                    : [...INVENTORY_STATES_WITHOUT_UNCHECKED, INVENTORY_STATES.UNCHECKED];

                const [storeys, items] = await Promise.all([
                    getJson(`/api/buildings/${buildingId}/storeys`),
                    fetchBuildingItems(eventId, buildingId, states),
                ]);

                const roomLists = await inBatches(
                    storeys.map((s) => async () =>
                        (await getJson(`/api/buildings/${buildingId}/storeys/${s.id}/rooms`)).map((r) => ({
                            id: r.id,
                            text: r.text,
                            storeyId: s.id,
                            storeyText: s.text,
                        }))
                    )
                );
                const catalog = roomLists.flat();
                const byId = new Map(catalog.map((r) => [String(r.id), { ...r, checked: 0, total: 0 }]));

                for (const item of items) {
                    const roomKey = item?.location?.room;
                    if (roomKey == null || roomKey === "") continue;
                    const key = String(roomKey);
                    let row = byId.get(key);
                    if (!row) {
                        // Místnost není v katalogu budovy — pořád ji ukážeme s ID.
                        row = {
                            id: roomKey,
                            text: `Místnost ${roomKey}`,
                            storeyId: item?.location?.storey ?? null,
                            storeyText: "",
                            checked: 0,
                            total: 0,
                        };
                        byId.set(key, row);
                    }
                    row.total += 1;
                    if (!isUncheckedState(item?.state)) row.checked += 1;
                }

                const counted = [...byId.values()];
                const visible = counted
                    .filter((r) => (workflow ? r.checked > 0 : r.total > 0))
                    .map((r) => (workflow ? { ...r, total: null } : r));

                if (!cancelled) setState({ loading: false, rooms: visible, error: null });
            } catch (error) {
                if (!cancelled) setState({ loading: false, rooms: [], error });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [eventId, buildingId, workflow]);

    return state;
}
