import { useState, useEffect } from 'react';
import { INVENTORY_DISPLAY_MODE } from '@/utils/inventoryStates';
import { THEME, THEME_STORAGE_KEY, applyTheme, readStoredTheme } from '@/utils/theme';
// Řízení režimu z EIRA (krok 5) je zatím vypnuté, aktivuje se po úpravě v EIRA.
// import {
//     SELECTED_INVENTURA_EVENT,
//     getInventuraForcedDisplayMode,
//     readSelectedInventura,
// } from '@/utils/inventuraDisplayMode';

const PAGE_SIZE_MIN = 5;
const PAGE_SIZE_MAX = 50;
const PAGE_SIZE_DEFAULT = 10;

function normalizePageSize(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return PAGE_SIZE_DEFAULT;
    return Math.max(PAGE_SIZE_MIN, Math.min(Math.trunc(parsed), PAGE_SIZE_MAX));
}

function readBool(key, fallback) {
    if (typeof window === 'undefined') return fallback;
    try {
        const saved = localStorage.getItem(key);
        return saved !== null ? Boolean(JSON.parse(saved)) : fallback;
    } catch (_e) {
        return fallback;
    }
}

function readInventoryDisplayMode() {
    if (typeof window === 'undefined') return INVENTORY_DISPLAY_MODE.WORKFLOW;
    try {
        const v = localStorage.getItem('settings_inventoryDisplayMode');
        if (v === INVENTORY_DISPLAY_MODE.FULL || v === INVENTORY_DISPLAY_MODE.WORKFLOW) {
            return v;
        }
        const legacy = localStorage.getItem('settings_hideUncheckedInventoryItems');
        if (legacy !== null) {
            return JSON.parse(legacy) ? INVENTORY_DISPLAY_MODE.WORKFLOW : INVENTORY_DISPLAY_MODE.FULL;
        }
    } catch (_e) {
        /* ignore */
    }
    return INVENTORY_DISPLAY_MODE.WORKFLOW;
}

export function useSettings() {
    const [imageDebugDelayEnabled, setImageDebugDelayEnabled] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('settings_imageDebugDelayEnabled');
            return saved !== null ? JSON.parse(saved) : false;
        }
        return false;
    });
    const [imageDebugDelayMs, setImageDebugDelayMs] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('settings_imageDebugDelayMs');
            const parsed = saved !== null ? Number(saved) : 700;
            return Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, 5000)) : 700;
        }
        return 700;
    });
    const [itemsPerPage, setItemsPerPage] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('settings_itemsPerPage');
            return normalizePageSize(saved !== null ? saved : PAGE_SIZE_DEFAULT);
        }
        return PAGE_SIZE_DEFAULT;
    });
    // Volba z Profilu. Platí jen tehdy, když vybraná inventura režim neurčuje (krok 5).
    const [localDisplayMode, setInventoryDisplayMode] = useState(readInventoryDisplayMode);
    // AKTIVACE PO ÚPRAVĚ V EIRA: odkomentovat blok níže (a import nahoře) a smazat řádek
    // „const forcedDisplayMode = null;“. Režim pak určí inventura a přepínač v Profilu se zamkne.
    const forcedDisplayMode = null;
    // const [forcedDisplayMode, setForcedDisplayMode] = useState(() =>
    //     getInventuraForcedDisplayMode(readSelectedInventura())
    // );
    // useEffect(() => {
    //     if (typeof window === 'undefined') return undefined;
    //     const sync = () => setForcedDisplayMode(getInventuraForcedDisplayMode(readSelectedInventura()));
    //     const onStorage = (e) => {
    //         if (!e || e.key === 'selectedInventura') sync();
    //     };
    //     window.addEventListener(SELECTED_INVENTURA_EVENT, sync);
    //     window.addEventListener('storage', onStorage);
    //     return () => {
    //         window.removeEventListener(SELECTED_INVENTURA_EVENT, sync);
    //         window.removeEventListener('storage', onStorage);
    //     };
    // }, []);
    const inventoryDisplayMode = forcedDisplayMode ?? localDisplayMode;
    // Skener: po načtení předmětu ze správné místnosti ho rovnou označit jako nalezený (výchozí Ne).
    const [scanAutoMarkFound, setScanAutoMarkFound] = useState(() => readBool('settings_scanAutoMarkFound', false));
    // Skener: krátký zvuk a vibrace po potvrzení (výchozí Ano).
    const [scanFeedback, setScanFeedback] = useState(() => readBool('settings_scanFeedback', true));
    // Vzhled: system = OS, light/dark = vynucený režim.
    const [theme, setTheme] = useState(readStoredTheme);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
            applyTheme(theme);
            window.dispatchEvent(new CustomEvent('settings-updated'));
        }
    }, [theme]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('settings_scanAutoMarkFound', JSON.stringify(scanAutoMarkFound));
            window.dispatchEvent(new CustomEvent('settings-updated'));
        }
    }, [scanAutoMarkFound]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('settings_scanFeedback', JSON.stringify(scanFeedback));
            window.dispatchEvent(new CustomEvent('settings-updated'));
        }
    }, [scanFeedback]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('settings_imageDebugDelayEnabled', JSON.stringify(imageDebugDelayEnabled));
            window.dispatchEvent(new CustomEvent('settings-updated'));
        }
    }, [imageDebugDelayEnabled]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('settings_imageDebugDelayMs', String(imageDebugDelayMs));
            window.dispatchEvent(new CustomEvent('settings-updated'));
        }
    }, [imageDebugDelayMs]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('settings_itemsPerPage', String(normalizePageSize(itemsPerPage)));
            window.dispatchEvent(new CustomEvent('settings-updated'));
        }
    }, [itemsPerPage]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('settings_inventoryDisplayMode', localDisplayMode);
            try {
                localStorage.removeItem('settings_hideUncheckedInventoryItems');
            } catch (_e) {
                /* ignore */
            }
            try {
                localStorage.removeItem('settings_recordStatus');
            } catch (_e2) {
                /* ignore */
            }
            window.dispatchEvent(new CustomEvent('settings-updated'));
        }
    }, [localDisplayMode]);

    return {
        imageDebugDelayEnabled,
        setImageDebugDelayEnabled,
        imageDebugDelayMs,
        setImageDebugDelayMs,
        itemsPerPage,
        setItemsPerPage: (next) => setItemsPerPage(normalizePageSize(next)),
        inventoryDisplayMode,
        setInventoryDisplayMode,
        /** true = režim určuje inventura v EIRA a v Profilu ho nelze změnit */
        inventoryDisplayModeLocked: forcedDisplayMode != null,
        scanAutoMarkFound,
        setScanAutoMarkFound,
        scanFeedback,
        setScanFeedback,
        theme,
        setTheme,
        THEME,
    };
}
