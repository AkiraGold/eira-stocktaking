"use client";

import React from "react";
import CenteredModal from "@/components/molecules/CenteredModal";
import Button from "@/components/atoms/Button";
import StateBadge from "@/components/atoms/StateBadge";
import { useOfflineStatus } from "@/offline/useOfflineStatus";
import { dismissConflicts } from "@/offline/offlineFetch";

/**
 * Stav připojení nahoře na obrazovce: bez signálu, čekající změny, odesílání.
 * Po odeslání ukáže předměty, které mezitím změnil někdo jiný (jeho změna platí).
 */
export default function ConnectionStatus() {
    const { online, pending, syncing, conflicts } = useOfflineStatus();
    const show = !online || pending > 0 || syncing;

    let text = "";
    let icon = "cloud_off";
    let bg = "var(--ink-soft)";
    if (!online) {
        text = pending > 0 ? `Bez signálu · ${pending} ${pending === 1 ? "změna čeká" : pending < 5 ? "změny čekají" : "změn čeká"} na odeslání` : "Bez signálu · změny se uloží do telefonu";
    } else if (syncing) {
        text = `Odesílám změny (${pending})…`;
        icon = "cloud_sync";
        bg = "var(--info)";
    } else if (pending > 0) {
        text = `${pending} ${pending === 1 ? "změna čeká" : pending < 5 ? "změny čekají" : "změn čeká"} na odeslání`;
        icon = "cloud_upload";
        bg = "var(--info)";
    }

    return (
        <>
            {show ? (
                <div
                    role="status"
                    aria-live="polite"
                    style={{
                        position: "fixed",
                        top: "max(8px, env(safe-area-inset-top))",
                        left: 0,
                        right: 0,
                        zIndex: 300,
                        display: "flex",
                        justifyContent: "center",
                        pointerEvents: "none",
                        padding: "0 12px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: bg,
                            color: !online ? "var(--on-ink)" : "var(--accent-ink)",
                            borderRadius: 999,
                            padding: "6px 14px",
                            fontSize: 13,
                            fontWeight: 600,
                            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                            maxWidth: "100%",
                        }}
                    >
                        <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 18 }}>{icon}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</span>
                    </div>
                </div>
            ) : null}

            <CenteredModal isOpen={online && !syncing && conflicts.length > 0} onClose={dismissConflicts} title="Některé změny se neuložily">
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.45 }}>
                        Tyto předměty mezitím změnil někdo jiný. Platí jeho změna, ta vaše se neodeslala.
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {conflicts.map((c) => (
                            <div key={`${c.eventId}-${c.id}-${c.at}`} style={{ borderRadius: 12, background: "var(--surface-2)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name || `Předmět ${c.id}`}</div>
                                {c.rejected ? (
                                    <div style={{ fontSize: 12, color: "var(--danger)" }}>Server změnu odmítl.</div>
                                ) : (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)", flexWrap: "wrap" }}>
                                        Platí: <StateBadge state={c.theirState} />
                                        {c.ourState ? <>· vaše: <StateBadge state={c.ourState} /></> : null}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <Button icon="check" iconPosition="right" onClick={dismissConflicts}>
                        Rozumím
                    </Button>
                </div>
            </CenteredModal>
        </>
    );
}
