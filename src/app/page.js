"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import LocationPickerModal from "@/components/organisms/LocationPickerModal";
import { useSelectedInventura } from "@/hooks/useSelectedInventura";
import { useSettings } from "@/hooks/useSettings";
import { useInventuraProgress } from "@/hooks/useInventuraProgress";
import { useRoomsProgress } from "@/hooks/useRoomsProgress";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSetLocation } from "@/hooks/useLocation";
import { useBuildings, useStoreys, useRooms } from "@/hooks/useBuildings";
import { useOfflineStatus } from "@/offline/useOfflineStatus";
import { buildStocktakingListUrl, buildScanUrl, HOME_PATH } from "@/utils/inventoryNavigation";
import { CLOSED_INVENTURA_MESSAGE, isInventuraActive, isInventuraClosed } from "@/utils/inventuraEventStates";
import { INVENTORY_STATES, INVENTORY_STATE_META, INVENTORY_DISPLAY_MODE } from "@/utils/inventoryStates";

const CHECKED_STATES = [
  INVENTORY_STATES.FOUND,
  INVENTORY_STATES.MOVED,
  INVENTORY_STATES.NOT_FOUND,
  INVENTORY_STATES.NEW,
];

const BAR_COLORS = {
  [INVENTORY_STATES.FOUND]: "var(--st-ok)",
  [INVENTORY_STATES.MOVED]: "var(--st-mv)",
  [INVENTORY_STATES.NOT_FOUND]: "var(--st-no)",
  [INVENTORY_STATES.NEW]: "var(--st-new)",
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--muted)",
  margin: 0,
};

function readStoredLocation() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("selectedLocation");
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
}

function initials(user) {
  const src = String(user?.name || user?.username || "").trim();
  if (!src) return "?";
  const parts = src.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : src.slice(0, 2);
  return letters.toUpperCase();
}

function ProgressBar({ segments, total, height = 6 }) {
  return (
    <div
      style={{
        display: "flex",
        height,
        borderRadius: 2,
        overflow: "hidden",
        background: "var(--wash)",
      }}
    >
      {total > 0 &&
        segments.map(({ key, value, color }) =>
          value ? <span key={key} style={{ width: `${(value / total) * 100}%`, background: color }} /> : null
        )}
    </div>
  );
}

/** Pulse block for home skeletons. */
function Bone({ width, height, style }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: 4,
        background: "linear-gradient(90deg, var(--surface-2) 25%, var(--skeleton-hi) 50%, var(--surface-2) 75%)",
        backgroundSize: "200% 100%",
        animation: "loading 1.5s infinite",
        ...style,
      }}
    />
  );
}

function InventuraProgressSkeleton({ workflow }) {
  return (
    <div role="status" aria-label="Načítám postup inventury" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <Bone width={36} height={28} />
          <Bone width={workflow ? 110 : 140} height={14} />
        </div>
        {workflow ? null : <Bone width={36} height={16} />}
      </div>
      {workflow ? null : <Bone width="100%" height={6} style={{ borderRadius: 2 }} />}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px" }}>
        {[72, 64, 88, 56].map((w) => (
          <Bone key={w} width={w} height={12} />
        ))}
      </div>
    </div>
  );
}

function RoomsListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Načítám místnosti"
      style={{ background: "var(--wash)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "14px 16px",
            borderTop: i ? "1px solid var(--line)" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Bone
              width={`${58 - i * 8}%`}
              height={15}
              style={{
                background: "linear-gradient(90deg, var(--skeleton) 25%, var(--skeleton-hi) 50%, var(--skeleton) 75%)",
                backgroundSize: "200% 100%",
              }}
            />
            <Bone
              width={36}
              height={13}
              style={{
                background: "linear-gradient(90deg, var(--skeleton) 25%, var(--skeleton-hi) 50%, var(--skeleton) 75%)",
                backgroundSize: "200% 100%",
              }}
            />
          </div>
          <Bone
            width="100%"
            height={4}
            style={{
              borderRadius: 2,
              background: "linear-gradient(90deg, var(--skeleton) 25%, var(--skeleton-hi) 50%, var(--skeleton) 75%)",
              backgroundSize: "200% 100%",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function InventuraCard({ inventura, active, closed, progress, workflow }) {
  const byState = progress.byState || {};
  const checked = CHECKED_STATES.reduce((sum, s) => sum + (byState[s] || 0), 0);
  const unchecked = byState[INVENTORY_STATES.UNCHECKED] || 0;
  const total = checked + unchecked;
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

  return (
    <div
      style={{
        background: "var(--surface)",
        color: "var(--fg)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: active ? 168 : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={labelStyle}>Aktuální inventura</div>
          <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.25, marginTop: 4 }}>
            {inventura ? inventura.name || `Inventura #${inventura.id}` : "Vyberte inventuru"}
          </div>
        </div>
        <Link
          href="/stocktakingList"
          aria-label="Změnit inventuru"
          title="Změnit inventuru"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--fg)",
            flexShrink: 0,
          }}
        >
          <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 20 }}>swap_horiz</span>
        </Link>
      </div>

      {closed ? (
        <div style={{ fontSize: 12, color: "var(--st-no)", lineHeight: 1.4 }}>{CLOSED_INVENTURA_MESSAGE}</div>
      ) : null}

      {active ? (
        progress.loading ? (
          <InventuraProgressSkeleton workflow={workflow} />
        ) : progress.error ? (
          <div style={{ fontSize: 13, color: "var(--st-no)" }}>Postup inventury se nepodařilo načíst.</div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: "var(--muted)", fontSize: 14 }}>
                <b style={{ fontSize: 28, color: "var(--fg)", fontWeight: 800 }}>{checked}</b>
                {workflow ? " zkontrolováno" : ` z ${total} zkontrolováno`}
              </span>
              {workflow ? null : (
                <span style={{ fontWeight: 700, fontSize: 15, color: "var(--fg)" }}>{percent}%</span>
              )}
            </div>
            {workflow ? null : (
              <ProgressBar
                total={total}
                segments={CHECKED_STATES.map((s) => ({ key: s, value: byState[s] || 0, color: BAR_COLORS[s] }))}
              />
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 12, color: "var(--muted)" }}>
              {CHECKED_STATES.map((s) => (
                <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 1, background: BAR_COLORS[s] }} />
                  {INVENTORY_STATE_META[s].label} {byState[s] || 0}
                </span>
              ))}
            </div>
          </>
        )
      ) : null}
    </div>
  );
}

function LocationCard({ location, onChange }) {
  const [open, setOpen] = useState(false);
  const { buildings } = useBuildings();
  const { storeys } = useStoreys(location?.building);
  const { rooms } = useRooms(location?.building, location?.storey);
  const storey = Array.isArray(storeys) ? storeys.find((s) => s.id === location?.storey) : null;
  const room = Array.isArray(rooms) ? rooms.find((r) => r.id === location?.room) : null;
  const building = Array.isArray(buildings) ? buildings.find((b) => b.id === location?.building) : null;

  let text = "Vyberte místnost";
  if (room) text = `${storey?.text ? `${storey.text} · ` : ""}${room.text}`;
  else if (storey) text = `${building?.text ? `${building.text} · ` : ""}${storey.text}`;
  else if (building) text = building.text;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          textAlign: "left",
          background: "var(--accent-soft)",
          border: "none",
          borderRadius: "var(--radius-lg)",
          padding: "14px 16px",
          cursor: "pointer",
          color: "var(--fg)",
        }}
      >
        <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 22, color: "var(--accent)" }}>place</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ ...labelStyle, display: "block" }}>Jsem v místnosti</span>
          <span style={{ display: "block", fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
            {text}
          </span>
        </span>
        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--accent)" }}>Změnit</span>
      </button>
      <LocationPickerModal
        isOpen={open}
        onClose={() => setOpen(false)}
        initialLocation={location}
        onSave={(loc) => onChange(loc?.noLocation ? null : { building: loc.building, storey: loc.storey, room: loc.room })}
      />
    </>
  );
}

function RoomsList({ rooms, loading, error, workflow, onOpenRoom }) {
  if (loading) return <RoomsListSkeleton />;
  if (error) return <div style={{ fontSize: 13, color: "var(--danger)" }}>Místnosti se nepodařilo načíst.</div>;
  if (!rooms.length) {
    return (
      <div style={{ fontSize: 13, color: "var(--muted)", padding: "4px 2px" }}>
        {workflow ? "Zatím žádná místnost se zkontrolovaným předmětem." : "V této budově nejsou žádné předměty inventury."}
      </div>
    );
  }
  return (
    <div style={{ background: "var(--wash)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      {rooms.map((r, i) => {
        const done = !workflow && r.total > 0 && r.checked >= r.total;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onOpenRoom(r)}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              width: "100%",
              textAlign: "left",
              padding: "14px 16px",
              background: "transparent",
              border: "none",
              borderTop: i ? "1px solid var(--line)" : "none",
              cursor: "pointer",
              color: "var(--ink)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
              <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.text}
                <span style={{ fontWeight: 400, fontSize: 12, color: "var(--muted)" }}> · {r.storeyText}</span>
              </span>
              {done ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--ok)", fontSize: 12, fontWeight: 700 }}>
                  <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 14 }}>check</span>
                  Hotovo
                </span>
              ) : (
                <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
                  {workflow ? `${r.checked}` : `${r.checked}/${r.total}`}
                </span>
              )}
            </span>
            {workflow ? null : (
              <ProgressBar total={r.total} height={4} segments={[{ key: "c", value: r.checked, color: done ? "var(--ok)" : "var(--accent)" }]} />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { selectedInventura } = useSelectedInventura();
  const { inventoryDisplayMode } = useSettings();
  const { user } = useCurrentUser();
  const { online } = useOfflineStatus();
  const { buildings } = useBuildings();
  const setLocationStorage = useSetLocation();
  const [location, setLocation] = useState(readStoredLocation);

  const inventuraActive = isInventuraActive(selectedInventura);
  const closedInventuraSelected = isInventuraClosed(selectedInventura);
  const workflow = inventoryDisplayMode === INVENTORY_DISPLAY_MODE.WORKFLOW;
  const eventId = inventuraActive ? selectedInventura.id : null;
  const progress = useInventuraProgress(eventId, location, inventoryDisplayMode);
  const buildingId = location?.building ?? (Array.isArray(buildings) && buildings.length ? buildings[0].id : null);
  const roomsProgress = useRoomsProgress(online ? eventId : null, buildingId, workflow);

  const changeLocation = (loc) => {
    setLocation(loc);
    if (loc) setLocationStorage(loc);
    else localStorage.removeItem("selectedLocation");
  };

  const openRoom = (r) => {
    const loc = { building: buildingId, storey: r.storeyId, room: r.id };
    changeLocation(loc);
    router.push(buildStocktakingListUrl(selectedInventura.id, { returnTo: HOME_PATH }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg)", padding: "1rem" }}>
      <main className="flex flex-col container" style={{ gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <h1 style={{ flex: 1, fontSize: 24, fontWeight: 800, margin: 0, color: "var(--fg)" }}>Přehled</h1>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              borderRadius: 999,
              padding: "3px 10px",
              fontSize: 12,
              fontWeight: 700,
              background: online ? "var(--accent-soft)" : "var(--st-no-bg)",
              color: online ? "var(--accent)" : "var(--st-no)",
            }}
          >
            {online ? "Online" : "Bez signálu"}
          </span>
          <Link
            href="/profile"
            aria-label="Profil"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "var(--accent-soft)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 12,
              textDecoration: "none",
            }}
          >
            {initials(user)}
          </Link>
        </div>

        <InventuraCard
          inventura={selectedInventura}
          active={inventuraActive}
          closed={closedInventuraSelected}
          progress={progress}
          workflow={workflow}
        />

        <LocationCard location={location} onChange={changeLocation} />

        {inventuraActive ? (
          <Link
            href={buildScanUrl(selectedInventura.id, { returnTo: HOME_PATH })}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              minHeight: 52,
              borderRadius: "var(--radius-lg)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 22 }}>qr_code_scanner</span>
            Skenovat tuto místnost
          </Link>
        ) : null}

        {inventuraActive && online ? (
          <>
            <div style={{ ...labelStyle, marginTop: 4 }}>Místnosti v inventuře</div>
            <RoomsList
              rooms={roomsProgress.rooms}
              loading={roomsProgress.loading}
              error={roomsProgress.error}
              workflow={workflow}
              onOpenRoom={openRoom}
            />
          </>
        ) : null}
      </main>
    </div>
  );
}
