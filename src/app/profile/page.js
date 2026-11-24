"use client";

import { SettingsForm } from "@/components/organisms/SettingsModal";
import OfflineDataCard from "@/components/organisms/OfflineDataCard";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSelectedInventura } from "@/hooks/useSelectedInventura";
import { clearAuthToken } from "@/utils/token";

const sectionLabel = { fontWeight: 700, fontSize: 14, color: "var(--muted)" };
const card = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: 16 };

export default function ProfilePage() {
    const { user, loading } = useCurrentUser();
    const { selectedInventura } = useSelectedInventura();

    const handleLogout = () => {
        clearAuthToken();
        window.location.assign("/error");
    };

    return (
        <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg)", padding: "1rem" }}>
            <main className="flex flex-col gap-4 container">
                <h1 style={{ fontSize: 24, fontWeight: 800, margin: "8px 0 0", color: "var(--fg)" }}>Profil</h1>

                <div style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 40, color: "var(--accent)" }}>account_circle</span>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: 16, color: "var(--fg)" }}>
                            {loading ? "Načítání..." : user?.username || user?.name || "Uživatel"}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>
                            {selectedInventura ? selectedInventura.name || `Inventura #${selectedInventura.id}` : "Není vybraná inventura"}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        aria-label="Odhlásit se"
                        title="Odhlásit se"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexShrink: 0,
                            minHeight: 40,
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: "1px solid var(--line)",
                            background: "var(--paper)",
                            color: "var(--danger)",
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                        }}
                    >
                        <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 18 }}>logout</span>
                        Odhlásit
                    </button>
                </div>

                <div style={sectionLabel}>Data v telefonu</div>
                <div style={card}>
                    <OfflineDataCard inventura={selectedInventura} />
                </div>

                <div style={sectionLabel}>Nastavení</div>
                <div style={card}>
                    <SettingsForm />
                </div>
            </main>
        </div>
    );
}
