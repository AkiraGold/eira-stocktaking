"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthHeadersSafe } from "@/utils/token";
import { getEffectiveInvNumber } from "@/utils/inventoryStates";

const LOOKUP_LIMIT = 100;

function normalizeCode(value) {
    return String(value ?? "").trim().toLowerCase();
}

/**
 * Zjistí, které předměty z hledání v majetku už jsou ve vybrané inventuře.
 * Stejný hledaný výraz se pošle do feedu inventury a výsledky se spárují podle inventárního čísla.
 * Bez hledaného výrazu se nic nezjišťuje (vrací known=false).
 */
export function useInventoryMembership({ eventId, search }) {
    const term = String(search ?? "").trim();
    const [byCode, setByCode] = useState(() => new Map());
    const [known, setKnown] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!eventId || !term) {
            setByCode(new Map());
            setKnown(false);
            return undefined;
        }
        const controller = new AbortController();
        setLoading(true);
        setKnown(false);
        const timer = setTimeout(async () => {
            try {
                const res = await fetch("/api/objects/feed", {
                    method: "POST",
                    headers: getAuthHeadersSafe(),
                    signal: controller.signal,
                    body: JSON.stringify({
                        eventId,
                        page: 0,
                        limit: LOOKUP_LIMIT,
                        sortBy: "name",
                        sortOrder: "asc",
                        search: term,
                        state: [],
                        hasNote: [],
                        roomId: null,
                        storeyId: null,
                        buildingId: null,
                    }),
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                const map = new Map();
                for (const it of data?.items || []) {
                    const code = normalizeCode(getEffectiveInvNumber(it));
                    if (code) map.set(code, it);
                }
                if (!controller.signal.aborted) {
                    setByCode(map);
                    setKnown(true);
                }
            } catch (_e) {
                if (!controller.signal.aborted) {
                    setByCode(new Map());
                    setKnown(false);
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 500);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [eventId, term]);

    /** Položka inventury pro předmět z majetku, nebo null. */
    const findInInventory = useCallback(
        (baseItem) => {
            const code = normalizeCode(getEffectiveInvNumber(baseItem));
            return code ? byCode.get(code) ?? null : null;
        },
        [byCode]
    );

    /** Po přidání do inventury označí předmět bez nového dotazu. */
    const markAdded = useCallback((baseItem, inventoryItem) => {
        const code = normalizeCode(getEffectiveInvNumber(baseItem));
        if (!code) return;
        setByCode((prev) => {
            const next = new Map(prev);
            next.set(code, inventoryItem);
            return next;
        });
    }, []);

    return { known, loading, findInInventory, markAdded };
}
