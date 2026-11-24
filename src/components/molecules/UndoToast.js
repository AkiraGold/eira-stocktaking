import React from "react";

/** Krátké oznámení dole na obrazovce, volitelně s tlačítkem Vrátit zpět. */
export default function UndoToast({ toast, onUndo, onClose, bottomOffset = 0 }) {
    if (!toast) return null;
    const isError = toast.kind === "error";
    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: `calc(var(--bottom-nav-h, 0px) + ${bottomOffset + 12}px)`,
                zIndex: 200,
                display: "flex",
                justifyContent: "center",
                padding: "0 1rem",
                pointerEvents: "none",
            }}
        >
            <div
                style={{
                    pointerEvents: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    maxWidth: 520,
                    background: isError ? "var(--danger)" : "var(--ink-soft)",
                    color: isError ? "var(--accent-ink)" : "var(--on-ink)",
                    borderRadius: 16,
                    padding: "12px 12px 12px 16px",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                    fontSize: 14,
                }}
            >
                <span style={{ flex: 1, minWidth: 0 }}>{toast.message}</span>
                {toast.undoable && !toast.undoing ? (
                    <button
                        type="button"
                        onClick={onUndo}
                        style={{
                            background: "none",
                            border: "none",
                            color: "var(--ok)",
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: "pointer",
                            padding: "6px 8px",
                        }}
                    >
                        Vrátit zpět
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Zavřít oznámení"
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 4, display: "flex" }}
                >
                    <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 18 }}>close</span>
                </button>
            </div>
        </div>
    );
}
