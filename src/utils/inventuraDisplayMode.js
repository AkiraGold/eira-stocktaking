import { INVENTORY_DISPLAY_MODE } from "@/utils/inventoryStates";

// Řízení režimu z EIRA (krok 5) je zatím VYPNUTÉ. Aktivace: viz komentář „AKTIVACE PO ÚPRAVĚ V EIRA“
// v hooks/useSettings.js a zakomentovaný useEffect v app/stocktakingList/page.js.

/** Událost v rámci jedné záložky: změnila se vybraná inventura (localStorage "selectedInventura"). */
export const SELECTED_INVENTURA_EVENT = "selected-inventura-changed";

/**
 * Režim zobrazení, který určuje inventura v EIRA (krok 5).
 *
 * Očekávané pole v položce z /api/events (návrh kontraktu pro EIRA):
 *   showExpectedItems: true  → Úplný (pracovník vidí očekávaný majetek)
 *   showExpectedItems: false → Pracovní (očekávaný majetek je skrytý)
 * Pro jistotu se přijímá i displayMode: "full" | "workflow".
 *
 * Vrací null, když inventura režim neposílá. Pak platí volba v Profilu jako dosud.
 */
export function getInventuraForcedDisplayMode(inventura) {
    if (!inventura || typeof inventura !== "object") return null;
    const show = inventura.showExpectedItems;
    if (typeof show === "boolean") {
        return show ? INVENTORY_DISPLAY_MODE.FULL : INVENTORY_DISPLAY_MODE.WORKFLOW;
    }
    if (show === "true" || show === "false") {
        return show === "true" ? INVENTORY_DISPLAY_MODE.FULL : INVENTORY_DISPLAY_MODE.WORKFLOW;
    }
    const mode = String(inventura.displayMode ?? "").trim().toLowerCase();
    if (mode === INVENTORY_DISPLAY_MODE.FULL || mode === INVENTORY_DISPLAY_MODE.WORKFLOW) return mode;
    return null;
}

export function readSelectedInventura() {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem("selectedInventura");
        return raw ? JSON.parse(raw) : null;
    } catch (_e) {
        return null;
    }
}

export function notifySelectedInventuraChanged() {
    if (typeof window === "undefined") return;
    try {
        window.dispatchEvent(new CustomEvent(SELECTED_INVENTURA_EVENT));
    } catch (_e) {
        /* ignore */
    }
}
