"use client";

import React, { useEffect, useState } from "react";
import Button from "@/components/atoms/Button";
import { useOfflineStatus } from "@/offline/useOfflineStatus";
import { downloadInventura, flushQueue, getDownloadInfo } from "@/offline/offlineFetch";

function formatTime(ts) {
    if (!ts) return "";
    return new Date(ts).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Profil: stažení inventury do telefonu a stav čekajících změn. */
export default function OfflineDataCard({ inventura }) {
    const { online, pending, syncing, downloading } = useOfflineStatus();
    const eventId = inventura?.id ? Number(inventura.id) : null;
    const [info, setInfo] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let alive = true;
        getDownloadInfo(eventId).then((i) => alive && setInfo(i));
        return () => {
            alive = false;
        };
    }, [eventId, downloading]);

    const handleDownload = async () => {
        setError("");
        try {
            const result = await downloadInventura(eventId);
            setInfo(result);
        } catch (e) {
            setError(e?.message || "Stažení se nepodařilo.");
        }
    };

    let line = "Inventura zatím není stažená. Bez signálu uvidíte jen předměty, které jste už otevřeli.";
    if (downloading) {
        line = `Stahuji… ${downloading.loaded}${downloading.total ? ` z ${downloading.total}` : ""} předmětů`;
    } else if (info) {
        line = `Inventura stažena ${formatTime(info.at)} · ${info.count} předmětů`;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "var(--fg)" }}>
                <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 20, color: "var(--muted)" }}>
                    {online ? "phone_iphone" : "cloud_off"}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span>{line}</span>
                    <span style={{ fontSize: 13, color: pending ? "var(--info)" : "var(--muted)", fontWeight: pending ? 700 : 400 }}>
                        {pending ? `${pending} změn čeká na odeslání` : "Všechny změny jsou odeslané"}
                        {!online ? " · bez signálu" : ""}
                    </span>
                </div>
            </div>
            {error ? <div style={{ fontSize: 12, color: "var(--danger)" }}>{error}</div> : null}
            <Button
                icon="download"
                iconPosition="right"
                variant="secondary"
                onClick={handleDownload}
                disabled={!eventId || !online || Boolean(downloading)}
            >
                {info ? "Aktualizovat data v telefonu" : "Stáhnout inventuru do telefonu"}
            </Button>
            {pending > 0 ? (
                <Button icon="cloud_upload" iconPosition="right" onClick={() => flushQueue()} disabled={!online || syncing}>
                    {syncing ? "Odesílám…" : "Odeslat změny teď"}
                </Button>
            ) : null}
            <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", lineHeight: 1.4 }}>
                Bez signálu jde měnit stav, přesouvat a psát poznámky. Zakládání předmětů a fotky jen se signálem.
                Aplikaci otevřete ještě se signálem a nechte ji otevřenou.
            </div>
        </div>
    );
}
