import { useState, useEffect } from "react";
import { getAuthHeadersSafe, isAuthenticated } from "@/utils/token";

export function useStocktakingLists({ page = 0, limit = 10, sortBy = "id", sortOrder = "asc" } = {}) {
  const [lists, setLists] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(() => isAuthenticated());
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      return;
    }

    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/events`, {
          method: "POST",
          headers: getAuthHeadersSafe(),
          body: JSON.stringify({
            page,
            limit,
            sortBy,
            sortOrder,
          }),
        });
        if (!res.ok) throw new Error("Failed to fetch stocktaking lists");
        const data = await res.json();
        if (cancelled) return;
        setLists(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total || 0);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, limit, sortBy, sortOrder]);

  return [lists, total, loading, error];
}
