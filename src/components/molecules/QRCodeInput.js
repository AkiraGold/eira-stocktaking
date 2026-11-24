"use client";

import { useState } from "react";
import QRScannerModal from "@/components/organisms/QRScannerModal";
import TextInput from "@/components/atoms/TextInput";

/** Inventurizační číslo / QR — type manually or scan (same value for both DB columns). */
export default function QRCodeInput({
  value,
  onChange,
  editMode = true,
  validateAvailability = false,
  checking = false,
  available = null,
  checkError = null,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleScan = (scannedValue) => {
    if (scannedValue) {
      onChange(typeof scannedValue === "string" ? scannedValue.trim() : String(scannedValue));
      setIsModalOpen(false);
    }
  };

  const trimmed = String(value ?? "").trim();
  const showConflict = validateAvailability && trimmed && available === false;
  const showOk = validateAvailability && trimmed && available === true && !checking;

  if (!editMode) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ color: "var(--muted)", fontWeight: 500, fontSize: 14 }}>
          Inventurizační číslo / QR:
        </div>
        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--fg)' }}>
          {trimmed || "—"}
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            width: "100%",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <TextInput
              label="Inventurizační číslo / QR"
              placeholder="Zadejte číslo"
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            title="Naskenovat kód"
            aria-label="Naskenovat kód"
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              marginBottom: 2,
              borderRadius: 12,
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              cursor: "pointer",
              color: 'var(--fg)',
            }}
          >
            <span className="material-icons-round" style={{ fontSize: 22 }}>
              qr_code_scanner
            </span>
          </button>
        </div>
        {validateAvailability && trimmed && checking && (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Kontroluji číslo…</div>
        )}
        {showConflict && (
          <div style={{ fontSize: 12, color: "var(--danger)", fontWeight: 600 }}>
            Toto inventurizační číslo / QR je již použito.
          </div>
        )}
        {showOk && (
          <div style={{ fontSize: 12, color: "var(--ok)", fontWeight: 600 }}>
            Inventurizační číslo / QR je volné.
          </div>
        )}
        {checkError && (
          <div style={{ fontSize: 12, color: "var(--danger)" }}>
            Nepodařilo se ověřit inventurizační číslo / QR.
          </div>
        )}
      </div>
      <QRScannerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onScan={handleScan}
        validate={false}
      />
    </>
  );
}
