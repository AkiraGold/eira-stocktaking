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
    const canLookup = Boolean(eventId && term);
    const lookupKey = `${eventId ?? ""}:${term}`;

    const [byCode, setByCode] = useState(() => new Map());
    const [known, setKnown] = useState(false);
    const [loading, setLoading] = useState(canLookup);
    const [prevLookupKey, setPrevLookupKey] = useState(lookupKey);

    if (lookupKey !== prevLookupKey) {
        setPrevLookupKey(lookupKey);
        if (!canLookup) {
            setByCode(new Map());
            setKnown(false);
            setLoading(false);
        } else {
            setKnown(false);
            setLoading(true);
        }
    }

    useEffect(() => {
        if (!canLookup) return undefined;

        const controller = new AbortController();
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
    }, [eventId, term, canLookup]);

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
