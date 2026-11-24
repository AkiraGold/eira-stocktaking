/**
 * Malé úložiště v telefonu (IndexedDB) pro práci bez signálu.
 * items: předměty inventury, klíč "<eventId>:<id>"
 * kv:    ostatní (fronta změn, uložené odpovědi serveru, informace o stažení)
 */
const DB_NAME = "eira-offline";
const DB_VERSION = 1;

let dbPromise = null;

function openDb() {
    if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB není k dispozici"));
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains("items")) db.createObjectStore("items", { keyPath: "key" });
                if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv", { keyPath: "k" });
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => {
                dbPromise = null;
                reject(req.error);
            };
        });
    }
    return dbPromise;
}

function tx(store, mode, fn) {
    return openDb().then(
        (db) =>
            new Promise((resolve, reject) => {
                const t = db.transaction(store, mode);
                const s = t.objectStore(store);
                let result;
                Promise.resolve(fn(s)).then((r) => {
                    result = r;
                });
                t.oncomplete = () => resolve(result);
                t.onerror = () => reject(t.error);
                t.onabort = () => reject(t.error);
            })
    );
}

function reqToPromise(req) {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export const itemKey = (eventId, id) => `${Number(eventId)}:${Number(id)}`;

export async function kvGet(k) {
    try {
        let out;
        await tx("kv", "readonly", (s) => reqToPromise(s.get(k)).then((r) => (out = r?.v)));
        return out;
    } catch (_e) {
        return undefined;
    }
}

export async function kvSet(k, v) {
    try {
        await tx("kv", "readwrite", (s) => s.put({ k, v }));
    } catch (_e) {
        /* úložiště nedostupné, pokračujeme bez něj */
    }
}

export async function putItems(eventId, items) {
    if (!items?.length) return;
    try {
        await tx("items", "readwrite", (s) => {
            for (const it of items) {
                if (it?.id == null) continue;
                const { image, ...rest } = it; // fotky se do telefonu neukládají
                s.put({ ...rest, key: itemKey(eventId, it.id), eventId: Number(eventId) });
            }
        });
    } catch (_e) {
        /* ignore */
    }
}

export async function getItem(eventId, id) {
    try {
        let out;
        await tx("items", "readonly", (s) => reqToPromise(s.get(itemKey(eventId, id))).then((r) => (out = r)));
        return out || null;
    } catch (_e) {
        return null;
    }
}

export async function getEventItems(eventId) {
    try {
        let out = [];
        await tx("items", "readonly", (s) => reqToPromise(s.getAll()).then((r) => (out = r || [])));
        return out.filter((it) => Number(it.eventId) === Number(eventId));
    } catch (_e) {
        return [];
    }
}

export function stripKey(item) {
    if (!item) return item;
    const { key, eventId, ...rest } = item;
    return rest;
}
