import { useState, useEffect, useCallback } from 'react';
import { getAuthHeadersSafe, isAuthenticated } from '@/utils/token';

export function useStocktakingItem(id, eventId) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(id && isAuthenticated()));
  const [error, setError] = useState(null);
  const [prevKey, setPrevKey] = useState(`${id ?? ''}:${eventId ?? ''}`);
  const key = `${id ?? ''}:${eventId ?? ''}`;

  if (key !== prevKey) {
    setPrevKey(key);
    if (!id || !isAuthenticated()) {
      setItem(null);
      setLoading(false);
      setError(null);
    } else {
      setItem(null);
      setLoading(true);
      setError(null);
    }
  }

  const fetchItem = useCallback(() => {
    if (!id) return Promise.resolve();

    if (!isAuthenticated()) {
      setLoading(false);
      return Promise.resolve();
    }

    setLoading(true);
    const body = { id };
    if (eventId) {
      body.eventId = eventId;
    }

    return fetch(`/api/objects/by-id`, {
      method: 'POST',
      headers: getAuthHeadersSafe(),
      body: JSON.stringify(body)
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to fetch stocktaking item - HTTP ${res.status}: ${errorText || res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        setItem(data);
        setError(null);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [id, eventId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (!id || !isAuthenticated()) return;
      await fetchItem();
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchItem, id]);

  return [item, loading, error, fetchItem];
}

export function useInventoryObjectByQr(qr, eventId) {
  const normalizedQr = qr ? String(qr).trim() : '';
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(normalizedQr));
  const [error, setError] = useState(null);
  const [resolvedQr, setResolvedQr] = useState(null);
  const [prevKey, setPrevKey] = useState(`${normalizedQr}:${eventId ?? ''}`);
  const key = `${normalizedQr}:${eventId ?? ''}`;

  if (key !== prevKey) {
    setPrevKey(key);
    if (!normalizedQr) {
      setItem(null);
      setLoading(false);
      setError(null);
      setResolvedQr(null);
    } else {
      setItem(null);
      setLoading(true);
      setError(null);
      setResolvedQr(null);
    }
  }

  useEffect(() => {
    if (!normalizedQr) return;

    const abortController = new AbortController();
    const body = { qr: normalizedQr };
    if (eventId) {
      body.eventId = eventId;
    }

    fetch(`/api/objects/by-qr`, {
      method: 'POST',
      headers: getAuthHeadersSafe(),
      body: JSON.stringify(body),
      signal: abortController.signal
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to fetch item by QR - HTTP ${res.status}: ${errorText || res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!abortController.signal.aborted) {
          setItem(data);
          setError(null);
          setResolvedQr(normalizedQr);
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          setItem(null);
          setError(err);
          setResolvedQr(normalizedQr);
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [normalizedQr, eventId]);

  return [item, loading, error, resolvedQr];
}

export function useCreateInventoryObject(eventId) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const createItem = async (item) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const itemWithEventId = { ...item };
      if (eventId) {
        itemWithEventId.eventId = eventId;
      }
      const res = await fetch('/api/objects/create', {
        method: 'POST',
        headers: getAuthHeadersSafe(),
        body: JSON.stringify(itemWithEventId),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to create item - HTTP ${res.status}: ${errorText || res.statusText}`);
      }
      setSuccess(true);
      return await res.json();
    } catch (err) {
      setError(err);
      setSuccess(false);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createItem, loading, error, success };
}

export function useUpdateInventoryObject(eventId) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const updateItem = async (item) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const itemWithEventId = { ...item };
      if (eventId) {
        itemWithEventId.eventId = eventId;
      }
      const res = await fetch('/api/objects/update', {
        method: 'POST',
        headers: getAuthHeadersSafe(),
        body: JSON.stringify(itemWithEventId),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to update item - HTTP ${res.status}: ${errorText || res.statusText}`);
      }
      setSuccess(true);
      return await res.json();
    } catch (err) {
      setError(err);
      setSuccess(false);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { updateItem, loading, error, success };
}

export function useDeleteInventoryObject(eventId) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const deleteItem = async (id) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const body = { id };
      if (eventId) {
        body.eventId = eventId;
      }
      const res = await fetch('/api/objects/delete', {
        method: 'POST',
        headers: getAuthHeadersSafe(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to delete item - HTTP ${res.status}: ${errorText || res.statusText}`);
      }
      setSuccess(true);
      return await res.json();
    } catch (err) {
      setError(err);
      setSuccess(false);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { deleteItem, loading, error, success };
}

export function useDuplicateInventoryObject(eventId) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const duplicateItem = async (id, code) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const body = { id };
      if (eventId) {
        body.eventId = eventId;
      }
      const trimmed = String(code ?? "").trim();
      if (trimmed) {
        body.invNumber = trimmed;
        body.qr = trimmed;
      }
      const res = await fetch('/api/objects/duplicate', {
        method: 'POST',
        headers: getAuthHeadersSafe(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to duplicate item - HTTP ${res.status}: ${errorText || res.statusText}`);
      }
      setSuccess(true);
      return await res.json();
    } catch (err) {
      setError(err);
      setSuccess(false);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { duplicateItem, loading, error, success };
}

export function useLookupInventoryObjectByQrAny() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const lookupByQrAny = useCallback(async (qr) => {
    const normalized = String(qr ?? "").trim();
    if (!normalized) {
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/objects/by-qr-any", {
        method: "POST",
        headers: getAuthHeadersSafe(),
        body: JSON.stringify({ qr: normalized }),
      });
      if (!res.ok) {
        return null;
      }
      return await res.json();
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookupByQrAny, loading, error };
}
