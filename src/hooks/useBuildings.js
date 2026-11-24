import { useState, useEffect, useCallback } from 'react';
import { getAuthHeadersSafe, isAuthenticated } from '@/utils/token';

let buildingsCache = null;
let buildingsInFlightPromise = null;
const storeysCache = new Map();
const storeysInFlight = new Map();
const roomsCache = new Map();
const roomsInFlight = new Map();

export function useBuildings() {
    const [buildings, setBuildings] = useState(() => buildingsCache || []);
    const [loading, setLoading] = useState(() => isAuthenticated() && !buildingsCache);
    const [error, setError] = useState(null);

    const fetchBuildings = useCallback(async () => {
        if (!isAuthenticated()) {
            setLoading(false);
            return;
        }

        // Fast path: serve shared in-memory cache.
        if (buildingsCache) {
            setBuildings(buildingsCache);
            setLoading(false);
            return;
        }

        // If another hook instance is already fetching, await it.
        if (buildingsInFlightPromise) {
            setLoading(true);
            setError(null);
            try {
                const sharedData = await buildingsInFlightPromise;
                setBuildings(sharedData || []);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        setError(null);

        try {
            buildingsInFlightPromise = (async () => {
                const res = await fetch('/api/buildings', {
                    method: 'GET',
                    headers: getAuthHeadersSafe(),
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`HTTP ${res.status}: ${errorText}`);
                }

                const data = await res.json();
                return data || [];
            })();

            const data = await buildingsInFlightPromise;
            buildingsCache = data || [];
            setBuildings(buildingsCache);
        } catch (err) {
            setError(err);
        } finally {
            buildingsInFlightPromise = null;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await Promise.resolve();
            if (cancelled) return;
            await fetchBuildings();
        })();
        return () => {
            cancelled = true;
        };
    }, [fetchBuildings]);

    return { buildings, loading, error, refetch: fetchBuildings };
}

export function useStoreys(buildingId) {
    const cacheKey = buildingId != null ? String(buildingId) : null;
    const [storeys, setStoreys] = useState(() =>
        cacheKey && storeysCache.has(cacheKey) ? storeysCache.get(cacheKey) || [] : []
    );
    const [loading, setLoading] = useState(
        () => Boolean(isAuthenticated() && buildingId && !(cacheKey && storeysCache.has(cacheKey)))
    );
    const [error, setError] = useState(null);
    const [prevBuildingId, setPrevBuildingId] = useState(buildingId);

    if (buildingId !== prevBuildingId) {
        setPrevBuildingId(buildingId);
        const nextKey = buildingId != null ? String(buildingId) : null;
        if (!isAuthenticated() || !buildingId) {
            setStoreys([]);
            setLoading(false);
            setError(null);
        } else if (nextKey && storeysCache.has(nextKey)) {
            setStoreys(storeysCache.get(nextKey) || []);
            setLoading(false);
            setError(null);
        } else {
            setStoreys([]);
            setLoading(true);
            setError(null);
        }
    }

    const fetchStoreys = useCallback(async () => {
        if (!isAuthenticated() || !buildingId) {
            setStoreys([]);
            setLoading(false);
            return;
        }

        const key = String(buildingId);
        if (storeysCache.has(key)) {
            setStoreys(storeysCache.get(key) || []);
            setLoading(false);
            return;
        }

        if (storeysInFlight.has(key)) {
            setLoading(true);
            setError(null);
            try {
                const sharedData = await storeysInFlight.get(key);
                setStoreys(sharedData || []);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const requestPromise = (async () => {
                const res = await fetch(`/api/buildings/${buildingId}/storeys`, {
                    method: 'GET',
                    headers: getAuthHeadersSafe(),
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`HTTP ${res.status}: ${errorText}`);
                }

                const data = await res.json();
                return data || [];
            })();
            storeysInFlight.set(key, requestPromise);
            const data = await requestPromise;
            storeysInFlight.delete(key);
            storeysCache.set(key, data);
            setStoreys(data || []);
        } catch (err) {
            storeysInFlight.delete(key);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [buildingId]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await Promise.resolve();
            if (cancelled) return;
            await fetchStoreys();
        })();
        return () => {
            cancelled = true;
        };
    }, [fetchStoreys]);

    return { storeys, loading, error, refetch: fetchStoreys };
}

export function useRooms(buildingId, storeyId) {
    const cacheKey =
        buildingId != null && storeyId != null ? `${buildingId}:${storeyId}` : null;
    const [rooms, setRooms] = useState(() =>
        cacheKey && roomsCache.has(cacheKey) ? roomsCache.get(cacheKey) || [] : []
    );
    const [loading, setLoading] = useState(
        () =>
            Boolean(
                isAuthenticated() &&
                    buildingId &&
                    storeyId &&
                    !(cacheKey && roomsCache.has(cacheKey))
            )
    );
    const [error, setError] = useState(null);
    const [prevIds, setPrevIds] = useState(`${buildingId}:${storeyId}`);
    const idsKey = `${buildingId}:${storeyId}`;

    if (idsKey !== prevIds) {
        setPrevIds(idsKey);
        const nextKey =
            buildingId != null && storeyId != null ? `${buildingId}:${storeyId}` : null;
        if (!isAuthenticated() || !buildingId || !storeyId) {
            setRooms([]);
            setLoading(false);
            setError(null);
        } else if (nextKey && roomsCache.has(nextKey)) {
            setRooms(roomsCache.get(nextKey) || []);
            setLoading(false);
            setError(null);
        } else {
            setRooms([]);
            setLoading(true);
            setError(null);
        }
    }

    const fetchRooms = useCallback(async () => {
        if (!isAuthenticated() || !buildingId || !storeyId) {
            setRooms([]);
            setLoading(false);
            return;
        }

        const key = `${buildingId}:${storeyId}`;
        if (roomsCache.has(key)) {
            setRooms(roomsCache.get(key) || []);
            setLoading(false);
            return;
        }

        if (roomsInFlight.has(key)) {
            setLoading(true);
            setError(null);
            try {
                const sharedData = await roomsInFlight.get(key);
                setRooms(sharedData || []);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const requestPromise = (async () => {
                const res = await fetch(`/api/buildings/${buildingId}/storeys/${storeyId}/rooms`, {
                    method: 'GET',
                    headers: getAuthHeadersSafe(),
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`HTTP ${res.status}: ${errorText}`);
                }

                const data = await res.json();
                return data || [];
            })();
            roomsInFlight.set(key, requestPromise);
            const data = await requestPromise;
            roomsInFlight.delete(key);
            roomsCache.set(key, data);
            setRooms(data || []);
        } catch (err) {
            roomsInFlight.delete(key);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [buildingId, storeyId]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await Promise.resolve();
            if (cancelled) return;
            await fetchRooms();
        })();
        return () => {
            cancelled = true;
        };
    }, [fetchRooms]);

    return { rooms, loading, error, refetch: fetchRooms };
}
