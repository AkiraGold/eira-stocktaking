/**
 * Práce bez signálu (krok 6).
 *
 * Aplikace volá server přes fetch("/api/..."). Tady se fetch v prohlížeči jednou obalí:
 * - Čtení (feed, detail, sken QR, budovy, uživatel…) jde na server a odpověď se uloží do telefonu.
 *   Bez signálu se odpoví z uložených dat.
 * - Změna předmětu (/api/objects/update: stav, přesun, poznámka) se bez signálu uloží do fronty
 *   a odešle se po návratu signálu.
 * - Souběh: před odesláním se načte aktuální stav předmětu. Pokud ho mezitím změnil někdo jiný,
 *   platí jeho (první uložená) změna, naše se neodešle a uživatel dostane upozornění.
 * - Zakládání předmětů, fotky, přílohy, mazání a propojování bez signálu nejdou.
 *
 * Omezení: aplikace musí být otevřená (načtená) už se signálem. Znovunačtení stránky bez signálu
 * vyžaduje service worker, který zatím není.
 */
import { getEventItems, getItem, kvGet, kvSet, putItems, stripKey } from "@/offline/db";
import { INVENTORY_STATES } from "@/utils/inventoryStates";
import { getAuthHeadersSafe } from "@/utils/token";

export const OFFLINE_STATUS_EVENT = "offline-status-changed";
/** Po odeslání fronty: seznamy si znovu načtou data ze serveru. */
export const OFFLINE_SYNCED_EVENT = "offline-synced";
const QUEUE_KEY = "queue:v1";
const CONFLICTS_KEY = "conflicts:v1";
const DOWNLOAD_KEY = (eventId) => `download:${Number(eventId)}`;
const RESPONSE_KEY = (method, path, body) => `resp:${method}:${path}:${body || ""}`;

const ALL_STATES = [
    INVENTORY_STATES.UNCHECKED,
    INVENTORY_STATES.FOUND,
    INVENTORY_STATES.NOT_FOUND,
    INVENTORY_STATES.MOVED,
    INVENTORY_STATES.NEW,
];

/** Čtecí volání, jejichž odpověď se uloží a bez signálu vrátí z telefonu. */
const CACHED_READS = [
    /^\/api\/user\/current$/,
    /^\/api\/buildings(\/.*)?$/,
    /^\/api\/states$/,
    /^\/api\/object-types$/,
    /^\/api\/events$/,
];

const OFFLINE_MESSAGE = "Bez signálu nelze tuto akci provést. Zkuste to znovu po připojení.";

let originalFetch = null;
let state = {
    online: true,
    pending: 0,
    syncing: false,
    conflicts: [],
    lastSyncAt: null,
    downloading: null,
};
let queue = [];
let queueLoaded = null;

function emit() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(OFFLINE_STATUS_EVENT, { detail: getOfflineStatus() }));
}

function setState(patch) {
    state = { ...state, ...patch };
    emit();
}

export function getOfflineStatus() {
    return { ...state, pending: queue.length };
}

/** Testovací přepínač „simulovat výpadek“ (localStorage offline_simulate=true). */
function simulatedOffline() {
    try {
        return localStorage.getItem("offline_simulate") === "true";
    } catch (_e) {
        return false;
    }
}

export function isOffline() {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
    return simulatedOffline();
}

function json(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json", "X-Offline": "1", ...extraHeaders },
    });
}

function offlineError() {
    return json({ message: OFFLINE_MESSAGE, offline: true }, 503);
}

function parseBody(init) {
    try {
        return init?.body ? JSON.parse(init.body) : {};
    } catch (_e) {
        return {};
    }
}

function sameRoom(a, b) {
    return String(a?.room ?? "") === String(b?.room ?? "");
}

/* ---------- fronta změn ---------- */

async function loadQueue() {
    if (!queueLoaded) {
        queueLoaded = kvGet(QUEUE_KEY).then((q) => {
            queue = Array.isArray(q) ? q : [];
            return kvGet(CONFLICTS_KEY);
        }).then((c) => {
            state.conflicts = Array.isArray(c) ? c : [];
            emit();
        });
    }
    return queueLoaded;
}

async function saveQueue() {
    await kvSet(QUEUE_KEY, queue);
    emit();
}

async function enqueueUpdate(body) {
    await loadQueue();
    const eventId = Number(body.eventId ?? body.stocktakingId);
    const id = Number(body.id);
    const local = await getItem(eventId, id);
    const existing = queue.find((op) => op.eventId === eventId && op.id === id);
    if (existing) {
        // Více změn téhož předmětu bez signálu: odešle se poslední, porovnává se s původním stavem.
        existing.body = body;
        existing.queuedAt = Date.now();
    } else {
        queue.push({
            eventId,
            id,
            body,
            queuedAt: Date.now(),
            baseline: local
                ? { state: local.state ?? null, lastCheck: local.lastCheck ?? null, note: local.note ?? "", location: local.location ?? null }
                : null,
            name: local?.name || body.name || "",
        });
    }
    const merged = { ...(local ? stripKey(local) : {}), ...body, pendingSync: true };
    delete merged.imgChanged;
    await putItems(eventId, [merged]);
    await saveQueue();
    return merged;
}

/** Odešle frontu. Volá se po návratu signálu, při startu a ručně z Profilu. */
export async function flushQueue() {
    if (!originalFetch || state.syncing) return;
    await loadQueue();
    if (!queue.length || isOffline()) return;
    setState({ syncing: true });
    const conflicts = [...state.conflicts];
    const before = queue.length;
    try {
        while (queue.length) {
            const op = queue[0];
            let current = null;
            try {
                const res = await originalFetch("/api/objects/by-id", {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify({ id: op.id, eventId: op.eventId }),
                });
                if (res.ok) current = await res.json();
                else if (res.status >= 500) break;
            } catch (_e) {
                break; // stále bez signálu
            }

            if (current && op.baseline && hasChangedSince(op.baseline, current)) {
                conflicts.push({
                    id: op.id,
                    eventId: op.eventId,
                    name: current.name || op.name,
                    at: Date.now(),
                    theirState: current.state ?? null,
                    ourState: op.body.state ?? null,
                });
                await putItems(op.eventId, [current]);
                queue.shift();
                await saveQueue();
                continue;
            }

            try {
                const res = await originalFetch("/api/objects/update", {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify(op.body),
                });
                if (!res.ok && res.status >= 500) break;
                if (!res.ok) {
                    // Server změnu odmítl (např. neplatná data); nezkoušet znovu, ale dát vědět.
                    conflicts.push({ id: op.id, eventId: op.eventId, name: op.name, at: Date.now(), rejected: true, ourState: op.body.state ?? null });
                }
                if (res.ok) {
                    const saved = await res.json().catch(() => null);
                    if (saved) await putItems(op.eventId, [{ ...saved, pendingSync: false }]);
                }
                queue.shift();
                await saveQueue();
            } catch (_e) {
                break;
            }
        }
    } finally {
        await kvSet(CONFLICTS_KEY, conflicts);
        setState({ syncing: false, conflicts, lastSyncAt: Date.now() });
        if (queue.length < before && typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent(OFFLINE_SYNCED_EVENT));
        }
    }
}

function hasChangedSince(baseline, current) {
    if (baseline.lastCheck != null || current.lastCheck != null) {
        if (String(baseline.lastCheck ?? "") !== String(current.lastCheck ?? "")) return true;
    }
    if (String(baseline.state ?? "") !== String(current.state ?? "")) return true;
    if (String(baseline.note ?? "") !== String(current.note ?? "")) return true;
    if (baseline.location && current.location && !sameRoom(baseline.location, current.location)) return true;
    return false;
}

export async function dismissConflicts() {
    await kvSet(CONFLICTS_KEY, []);
    setState({ conflicts: [] });
}

function authHeaders() {
    try {
        return getAuthHeadersSafe();
    } catch (_e) {
        return { "Content-Type": "application/json" };
    }
}

/* ---------- dotazy bez signálu ---------- */

function matchesSearch(item, term) {
    if (!term) return true;
    const t = term.toLowerCase();
    return [item.name, item.description, item.invNumber, item.qr, item.note].some((v) =>
        String(v ?? "").toLowerCase().includes(t)
    );
}

function compareBy(field, order) {
    const dir = order === "desc" ? -1 : 1;
    return (a, b) => {
        const va = a?.[field];
        const vb = b?.[field];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
        return String(va).localeCompare(String(vb), "cs", { numeric: true }) * dir;
    };
}

async function localFeed(body) {
    const items = await getEventItems(body.eventId);
    const states = Array.isArray(body.state) && body.state.length ? new Set(body.state) : null;
    const hasNote = Array.isArray(body.hasNote) ? body.hasNote : [];
    const filtered = items.filter((it) => {
        if (states && !states.has(it.state)) return false;
        if (body.roomId != null && String(it.location?.room ?? "") !== String(body.roomId)) return false;
        if (body.roomId == null && body.storeyId != null && String(it.location?.storey ?? "") !== String(body.storeyId)) return false;
        if (body.roomId == null && body.storeyId == null && body.buildingId != null && String(it.location?.building ?? "") !== String(body.buildingId)) return false;
        if (hasNote.length === 1) {
            const has = String(it.note ?? "").trim() !== "";
            if (hasNote[0] === "yes" && !has) return false;
            if (hasNote[0] === "no" && has) return false;
        }
        return matchesSearch(it, String(body.search ?? "").trim());
    });
    filtered.sort(compareBy(body.sortBy || "name", body.sortOrder));
    const limit = Number(body.limit) || 20;
    const page = Number(body.page) || 0;
    const slice = filtered.slice(page * limit, page * limit + limit).map(stripKey);
    return { items: slice, total: filtered.length, hasMoreNext: (page + 1) * limit < filtered.length, offline: true };
}

async function localByQr(body) {
    const code = String(body.qr ?? "").trim().toLowerCase();
    if (!code) return null;
    const items = await getEventItems(body.eventId);
    const hit = items.find(
        (it) => String(it.qr ?? "").trim().toLowerCase() === code || String(it.invNumber ?? "").trim().toLowerCase() === code
    );
    return hit ? stripKey(hit) : null;
}

/* ---------- obal fetch ---------- */

async function networkThenStore(input, init, method, path, bodyText) {
    const res = await originalFetch(input, init);
    if (res.ok) {
        res.clone()
            .text()
            .then((text) => kvSet(RESPONSE_KEY(method, path, bodyText), text))
            .catch(() => {});
    }
    return res;
}

async function cachedResponse(method, path, bodyText) {
    const text = await kvGet(RESPONSE_KEY(method, path, bodyText));
    if (text == null) return offlineError();
    return new Response(text, { status: 200, headers: { "Content-Type": "application/json", "X-Offline": "1" } });
}

async function handleApi(input, init, path, method) {
    const bodyText = typeof init?.body === "string" ? init.body : "";
    const body = method === "POST" ? parseBody(init) : {};
    const offline = isOffline();

    // Změna předmětu: bez signálu do fronty.
    if (path === "/api/objects/update") {
        if (body.imgChanged) {
            // Fotka se bez signálu neuloží.
            if (offline) return offlineError();
            return originalFetch(input, init);
        }
        if (!offline) {
            try {
                const res = await originalFetch(input, init);
                if (res.ok) {
                    res.clone().json().then((saved) => putItems(body.eventId ?? body.stocktakingId, [saved])).catch(() => {});
                }
                return res;
            } catch (_e) {
                setState({ online: false });
            }
        }
        const merged = await enqueueUpdate(body);
        return json(merged, 200, { "X-Offline-Queued": "1" });
    }

    if (path === "/api/objects/feed") {
        if (!offline) {
            try {
                const res = await originalFetch(input, init);
                if (res.ok) {
                    res.clone().json().then((data) => putItems(body.eventId, data?.items || [])).catch(() => {});
                }
                return res;
            } catch (_e) {
                setState({ online: false });
            }
        }
        return json(await localFeed(body));
    }

    if (path === "/api/objects/by-id" || path === "/api/objects/by-qr") {
        if (!offline) {
            try {
                const res = await originalFetch(input, init);
                if (res.ok && body.eventId) {
                    res.clone().json().then((data) => data && putItems(body.eventId, [data])).catch(() => {});
                }
                return res;
            } catch (_e) {
                setState({ online: false });
            }
        }
        const local = path === "/api/objects/by-id" ? await getItem(body.eventId, body.id) : await localByQr(body);
        if (local) return json(stripKey(local));
        return json({ message: "Předmět není v datech staženích do telefonu.", offline: true }, 404);
    }

    if (CACHED_READS.some((re) => re.test(path))) {
        if (!offline) {
            try {
                return await networkThenStore(input, init, method, path, bodyText);
            } catch (_e) {
                setState({ online: false });
            }
        }
        return cachedResponse(method, path, bodyText);
    }

    // Vše ostatní (zakládání, fotky, přílohy, mazání, propojování, majetek): jen se signálem.
    if (offline) return offlineError();
    try {
        return await originalFetch(input, init);
    } catch (e) {
        setState({ online: false });
        return offlineError();
    }
}

export function installOfflineFetch() {
    if (typeof window === "undefined" || originalFetch) return;
    originalFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
        let url;
        try {
            url = new URL(typeof input === "string" ? input : input.url, window.location.origin);
        } catch (_e) {
            return originalFetch(input, init);
        }
        if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/") || url.pathname.startsWith("/api/auth")) {
            return originalFetch(input, init);
        }
        const method = String(init?.method || (typeof input !== "string" && input.method) || "GET").toUpperCase();
        return handleApi(input, init, url.pathname, method);
    };

    const goOnline = () => {
        setState({ online: !isOffline() });
        flushQueue();
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", () => setState({ online: false }));
    // Pravidelně zkusit odeslat frontu (signál se může vrátit bez události "online").
    setInterval(() => {
        const online = !isOffline();
        if (online !== state.online) setState({ online });
        if (online && queue.length) flushQueue();
    }, 15000);
    state.online = !isOffline();
    loadQueue().then(() => flushQueue());
}

/** Ruční přepnutí simulace výpadku (jen pro test v prohlížeči). */
export function setSimulatedOffline(value) {
    try {
        if (value) localStorage.setItem("offline_simulate", "true");
        else localStorage.removeItem("offline_simulate");
    } catch (_e) {
        /* ignore */
    }
    setState({ online: !isOffline() });
    if (!value) flushQueue();
}

/* ---------- stažení inventury do telefonu ---------- */

export async function getDownloadInfo(eventId) {
    if (!eventId) return null;
    return (await kvGet(DOWNLOAD_KEY(eventId))) || null;
}

/**
 * Stáhne všechny předměty inventury (bez fotek) a seznam budov, podlaží a místností.
 * onProgress(načteno, celkem)
 */
export async function downloadInventura(eventId, onProgress) {
    if (!eventId || !originalFetch) throw new Error("Inventura není vybraná.");
    if (isOffline()) throw new Error(OFFLINE_MESSAGE);
    setState({ downloading: { loaded: 0, total: null } });
    try {
        const limit = 50;
        let page = 0;
        let loaded = 0;
        let total = null;
        for (;;) {
            const res = await originalFetch("/api/objects/feed", {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    eventId,
                    page,
                    limit,
                    sortBy: "id",
                    sortOrder: "asc",
                    search: "",
                    state: ALL_STATES,
                    hasNote: [],
                    roomId: null,
                    storeyId: null,
                    buildingId: null,
                }),
            });
            if (!res.ok) throw new Error(`Stažení se nepodařilo (HTTP ${res.status}).`);
            const data = await res.json();
            const items = data?.items || [];
            await putItems(eventId, items);
            loaded += items.length;
            total = Number(data?.total) || total;
            setState({ downloading: { loaded, total } });
            onProgress?.(loaded, total);
            const more = data?.hasMoreNext ?? (total != null ? loaded < total : items.length === limit);
            if (!more || !items.length) break;
            page += 1;
        }
        await downloadLocations();
        const info = { eventId: Number(eventId), at: Date.now(), count: loaded };
        await kvSet(DOWNLOAD_KEY(eventId), info);
        return info;
    } finally {
        setState({ downloading: null });
    }
}

async function downloadLocations() {
    const get = async (path) => {
        const res = await networkThenStore(path, { method: "GET", headers: authHeaders() }, "GET", path, "");
        return res.ok ? res.json() : [];
    };
    try {
        const buildings = await get("/api/buildings");
        for (const b of Array.isArray(buildings) ? buildings : []) {
            const storeys = await get(`/api/buildings/${b.id}/storeys`);
            for (const s of Array.isArray(storeys) ? storeys : []) {
                await get(`/api/buildings/${b.id}/storeys/${s.id}/rooms`);
            }
        }
    } catch (_e) {
        /* místnosti nejsou nutné ke stažení předmětů */
    }
}
