import React, { useState, useEffect, useMemo } from 'react';
import { getAuthHeadersSafe, isAuthenticated } from '@/utils/token';
import { mergeFeedPageIntoItems, parsePagedFeedPage } from '@/utils/feedPagination';
import { useSelectedInventura } from '@/hooks/useSelectedInventura';
import { useGetLocation } from '@/hooks/useLocation';
import { useBuildings, useStoreys, useRooms } from '@/hooks/useBuildings';
import Button from '@/components/atoms/Button';
import TextInput from '@/components/atoms/TextInput';
import CenteredModal from '@/components/molecules/CenteredModal';
import LocationPicker from '@/components/organisms/LocationPicker';

const PAGE_SIZE = 20;

function useLocationName(location) {
  const { buildings } = useBuildings();
  const { storeys } = useStoreys(location?.building);
  const { rooms } = useRooms(location?.building, location?.storey);

  if (!location) return null;

  const building = Array.isArray(buildings) ? buildings.find(b => b.id === location.building) : undefined;
  const storey = Array.isArray(storeys) ? storeys.find(s => s.id === location.storey) : undefined;
  const room = Array.isArray(rooms) ? rooms.find(r => r.id === location.room) : undefined;

  const parts = [];
  if (building) parts.push(building.text);
  if (storey) parts.push(storey.text);
  if (room) parts.push(room.text);

  return parts.length > 0 ? parts.join(' / ') : null;
}

function BaseItemCard({ item, isSelected, onClick }) {
  const locationName = useLocationName(item.location);

  return (
    <div
      style={{
        background: isSelected ? "var(--skeleton)" : "var(--surface)",
        borderRadius: "16px",
        padding: "1rem",
        cursor: "pointer",
        transition: "all 0.2s",
        border: isSelected ? "2px solid var(--ink-soft)" : "1px solid var(--line)",
        boxShadow: isSelected ? "0 2px 8px rgba(0,0,0,0.1)" : "0 1px 3px rgba(0,0,0,0.05)"
      }}
      onClick={onClick}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ fontWeight: 600, fontSize: "1rem", color: 'var(--fg)' }}>
          {item.name}
        </div>
        {item.description && (
          <div style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
            {item.description}
          </div>
        )}
        {locationName && (
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontStyle: "italic" }}>
            Místnost: {locationName}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BaseItemPicker({ isOpen, onClose, onSelectBaseItem }) {
    const { selectedInventura } = useSelectedInventura();
    const getLocation = useGetLocation();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [filterLocation, setFilterLocation] = useState(() => getLocation() ?? null);
    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
    const [sortBy, setSortBy] = useState('id');
    const [sortOrder, setSortOrder] = useState('asc');
    const [baseItems, setBaseItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [hasMoreNext, setHasMoreNext] = useState(false);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const excludeEventId = useMemo(() => {
        const raw = selectedInventura?.id;
        const n = Number(raw);
        return Number.isFinite(n) && n > 0 ? n : null;
    }, [selectedInventura?.id]);

    const canFetch = isOpen && excludeEventId != null && isAuthenticated();
    const [prevCanFetch, setPrevCanFetch] = useState(canFetch);
    if (canFetch !== prevCanFetch) {
        setPrevCanFetch(canFetch);
        if (!canFetch) {
            setBaseItems([]);
            setLoading(false);
            setLoadingMore(false);
            setError(null);
            setPage(0);
            setTotal(0);
            setHasMoreNext(false);
        }
    }

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
        return () => clearTimeout(t);
    }, [searchTerm]);

    const queryKey = useMemo(
        () =>
            JSON.stringify({
                e: excludeEventId,
                sortBy,
                sortOrder,
                search: debouncedSearch,
                b: filterLocation?.building ?? null,
                s: filterLocation?.storey ?? null,
                r: filterLocation?.room ?? null,
            }),
        [
            excludeEventId,
            sortBy,
            sortOrder,
            debouncedSearch,
            filterLocation?.building,
            filterLocation?.storey,
            filterLocation?.room,
        ]
    );

    const [prevQueryKey, setPrevQueryKey] = useState(queryKey);
    if (canFetch && queryKey !== prevQueryKey) {
        setPrevQueryKey(queryKey);
        if (page !== 0) {
            setPage(0);
        }
    }

    useEffect(() => {
        if (!canFetch) {
            return undefined;
        }

        const ac = new AbortController();

        (async () => {
            await Promise.resolve();
            if (ac.signal.aborted) return;
            if (page === 0) setLoading(true);
            else setLoadingMore(true);
            setError(null);
            try {
                const body = {
                    page,
                    limit: PAGE_SIZE,
                    sortBy,
                    sortOrder,
                    search: debouncedSearch,
                    excludeEventId,
                };
                if (filterLocation?.building) body.buildingId = filterLocation.building;
                if (filterLocation?.storey) body.storeyId = filterLocation.storey;
                if (filterLocation?.room) body.roomId = filterLocation.room;

                const res = await fetch('/api/base-items/feed', {
                    method: 'POST',
                    headers: getAuthHeadersSafe(),
                    body: JSON.stringify(body),
                    signal: ac.signal,
                });
                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`HTTP ${res.status}: ${errorText}`);
                }
                const data = await res.json();
                if (!ac.signal.aborted) {
                    const { pageItems, resolvedTotal, hasMoreNext: more } = parsePagedFeedPage(data);
                    setBaseItems((prev) =>
                        page === 0 ? pageItems : mergeFeedPageIntoItems(prev, pageItems)
                    );
                    setTotal(resolvedTotal);
                    setHasMoreNext(more);
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
                if (!ac.signal.aborted) setError(err);
            } finally {
                if (!ac.signal.aborted) {
                    if (page === 0) setLoading(false);
                    else setLoadingMore(false);
                }
            }
        })();

        return () => {
            ac.abort();
        };
    }, [
        canFetch,
        excludeEventId,
        page,
        queryKey,
        sortBy,
        sortOrder,
        debouncedSearch,
        filterLocation?.building,
        filterLocation?.storey,
        filterLocation?.room,
    ]);

    const handleSelectItem = (item) => {
        setSelectedItem(item);
    };

    const handleConfirm = () => {
        if (selectedItem) {
            onSelectBaseItem(selectedItem);
            onClose();
            setSelectedItem(null);
            setSearchTerm('');
        }
    };

    const handleClose = () => {
        onClose();
        setSelectedItem(null);
        setSearchTerm('');
    };


    if (!selectedInventura) {
        return (
            <CenteredModal isOpen={isOpen} onClose={handleClose} title="Vybrat základní položku">
                <div style={{ color: 'var(--danger)', fontWeight: 600, padding: '1rem' }}>
                    Nejprve vyberte inventuru na hlavní stránce.
                </div>
            </CenteredModal>
        );
    }


    return (
        <CenteredModal isOpen={isOpen} onClose={handleClose} title="Vybrat základní položku" disableClickAway={isLocationPickerOpen}>
            <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                height: "80dvh", 
                maxHeight: "600px", 
                minHeight: "400px",
                position: "relative"
            }}>
                <div style={{ flexShrink: 0 }}>
                    <div style={{ marginBottom: "0.75rem" }}>
                        <TextInput
                            placeholder="Hledat položky..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                width: "100%",
                                border: "1px solid var(--line)",
                                borderRadius: "8px",
                                padding: "0.75rem",
                                fontSize: "0.875rem"
                            }}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
                        <LocationPicker
                            value={filterLocation}
                            onChange={setFilterLocation}
                            editMode={true}
                            label="Lokace:"
                            onModalOpen={() => setIsLocationPickerOpen(true)}
                            onModalClose={() => setIsLocationPickerOpen(false)}
                        />

                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500, minWidth: "60px" }}>
                                Seřadit:
                            </div>
                            <div style={{ flex: 1, display: "flex", gap: "0.25rem" }}>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: "0.5rem",
                                        border: "1px solid var(--line)",
                                        borderRadius: "6px",
                                        fontSize: "0.875rem",
                                        backgroundColor: 'var(--surface)'
                                    }}
                                >
                                    <option value="id">ID</option>
                                    <option value="name">Název</option>
                                    <option value="description">Popis</option>
                                </select>
                                <button
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    style={{
                                        padding: "0.5rem",
                                        border: "1px solid var(--line)",
                                        borderRadius: "6px",
                                        backgroundColor: 'var(--surface)',
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        minWidth: "40px",
                                        height: "40px"
                                    }}
                                >
                                    <span className="material-icons-round" style={{ fontSize: "14px" }}>
                                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>


                <div style={{ 
                    flex: 1, 
                    display: "flex", 
                    flexDirection: "column", 
                    minHeight: 0,
                    overflow: "hidden"
                }}>
                    {total > 0 && (
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "0.35rem" }}>
                            Celkem: {total}
                            {baseItems.length > 0 && baseItems.length < total ? ` · zobrazeno ${baseItems.length}` : null}
                        </div>
                    )}

                    {loading && baseItems.length === 0 && (
                        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
                            Načítání...
                        </div>
                    )}

                    {error && (
                        <div style={{ color: "var(--danger)", padding: "1rem" }}>
                            Chyba: {error.message}
                        </div>
                    )}

                    {!error && (baseItems.length > 0 || !loading) && (
                        <div style={{ 
                            display: "flex", 
                            flexDirection: "column", 
                            gap: "0.5rem", 
                            overflowY: "auto",
                            flex: 1,
                            paddingRight: "4px" // Space for scrollbar
                        }}>
                            {baseItems.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
                                    {debouncedSearch
                                        ? `Žádné položky nenalezeny pro „${debouncedSearch}“`
                                        : "Žádné položky neodpovídají filtru nebo už jsou v této inventuře."}
                                </div>
                            ) : (
                                baseItems.map(item => (
                                    <BaseItemCard
                                        key={item.id}
                                        item={item}
                                        isSelected={selectedItem?.id === item.id}
                                        onClick={() => handleSelectItem(item)}
                                    />
                                ))
                            )}
                            {hasMoreNext && baseItems.length > 0 && (
                                <div style={{ padding: "0.5rem 0", textAlign: "center" }}>
                                    <Button
                                        variant="secondary"
                                        disabled={loadingMore}
                                        onClick={() => setPage((p) => p + 1)}
                                    >
                                        {loadingMore ? "Načítání…" : "Načíst další"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ 
                    display: "flex", 
                    gap: "0.5rem", 
                    justifyContent: "flex-end", 
                    paddingTop: "0.75rem", 
                    borderTop: "1px solid var(--line)", 
                    marginTop: "0.75rem",
                    flexShrink: 0,
                    backgroundColor: 'var(--surface)',
                    position: "sticky",
                    bottom: 0
                }}>
                    <Button variant="secondary" onClick={handleClose}>
                        Storno
                    </Button>
                    <Button 
                        onClick={handleConfirm}
                        disabled={!selectedItem}
                        icon="check"
                        iconPosition="right"
                    >
                        Vybrat položku
                    </Button>
                </div>
            </div>
        </CenteredModal>
    );
}
