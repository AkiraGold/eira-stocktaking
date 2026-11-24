import React from "react";

const buttonBase = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 40,
    padding: "8px 10px",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
};

/**
 * Tlačítka Nalezeno / Nenalezeno přímo na kartě předmětu.
 * Karta je odkaz na detail, proto klepnutí nesmí propadnout do odkazu.
 */
export default function QuickStateActions({ onMarkFound, onMarkNotFound, pending = false }) {
    const handle = (callback) => (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (pending) return;
        callback?.();
    };

    return (
        <div style={{ display: "flex", gap: 8, marginTop: 10, opacity: pending ? 0.55 : 1 }}>
            <button
                type="button"
                onClick={handle(onMarkFound)}
                disabled={pending}
                aria-label="Označit jako nalezeno"
                style={{ ...buttonBase, background: "var(--ok)", color: 'var(--accent-ink)', border: "1px solid var(--ok)" }}
            >
                <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 18 }}>check</span>
                Nalezeno
            </button>
            <button
                type="button"
                onClick={handle(onMarkNotFound)}
                disabled={pending}
                aria-label="Označit jako nenalezeno"
                style={{ ...buttonBase, background: 'var(--surface)', color: "var(--danger)", border: "1px solid var(--danger)" }}
            >
                <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 18 }}>close</span>
                Nenalezeno
            </button>
        </div>
    );
}
