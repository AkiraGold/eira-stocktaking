"use client";

import React, { useEffect, useState } from "react";
import CenteredModal from "@/components/molecules/CenteredModal";
import LinkInventuraStateSelect from "@/components/molecules/LinkInventuraStateSelect";
import Button from "@/components/atoms/Button";
import TextInput from "@/components/atoms/TextInput";
import CardItemName from "@/components/atoms/CardItemName";
import LocationPicker from "@/components/organisms/LocationPicker";
import { useBaseItemDetails, useLinkBaseItemToEvent } from "@/hooks/useBaseItems";
import {
    DEFAULT_LINK_INVENTURA_STATE,
    getEffectiveInvNumber,
    resolveLinkToInventuraState,
} from "@/utils/inventoryStates";

/**
 * Přidání předmětu z majetku do vybrané inventury (dříve obrazovka „Propojit existující“).
 * Volání API je stejné jako v LinkItemForm.
 */
export default function AddToInventoryModal({ baseItem, eventId, onClose, onAdded }) {
    const { fetchById } = useBaseItemDetails();
    const { linkToEvent, loading } = useLinkBaseItemToEvent();
    const [details, setDetails] = useState(null);
    const [status, setStatus] = useState(DEFAULT_LINK_INVENTURA_STATE);
    const [note, setNote] = useState("");
    const [error, setError] = useState("");
    const [prevBaseItemId, setPrevBaseItemId] = useState(baseItem?.id);

    if (baseItem?.id !== prevBaseItemId) {
        setPrevBaseItemId(baseItem?.id);
        setDetails(null);
        setStatus(DEFAULT_LINK_INVENTURA_STATE);
        setNote("");
        setError("");
    }

    useEffect(() => {
        if (!baseItem?.id) return;
        let alive = true;
        fetchById(baseItem.id)
            .then((d) => alive && setDetails(d))
            .catch(() => alive && setDetails(null));
        return () => {
            alive = false;
        };
    }, [baseItem?.id, fetchById]);

    const source = details || baseItem;
    const invCode = source ? getEffectiveInvNumber(source) : "";

    const handleAdd = async () => {
        if (!baseItem || !eventId || !invCode) return;
        setError("");
        try {
            const state = resolveLinkToInventuraState(status);
            const created = await linkToEvent({
                rmId: baseItem.id,
                eventId,
                status: state,
                note,
                qr: invCode,
                location: source.location || null,
            });
            onAdded?.(baseItem, { ...(created || {}), state: created?.state ?? state });
        } catch (e) {
            setError(e?.message || "Předmět se nepodařilo přidat do inventury.");
        }
    };

    return (
        <CenteredModal isOpen={Boolean(baseItem)} onClose={onClose} title="Přidat do inventury">
            {baseItem ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                        <CardItemName>{source.name}</CardItemName>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>
                            {invCode ? `Inv. č. ${invCode}` : "Bez inventárního čísla"}
                        </div>
                    </div>
                    {source.location ? <LocationPicker value={source.location} label="Umístění v evidenci:" editMode={false} /> : null}
                    <LinkInventuraStateSelect value={status} onChange={setStatus} />
                    <TextInput
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        label="Poznámka k inventuře"
                        placeholder="Nepovinné"
                        multiline
                    />
                    {!invCode ? (
                        <div style={{ fontSize: 12, color: "var(--danger)" }}>
                            Předmět nemá inventární číslo, proto ho nelze přidat do inventury.
                        </div>
                    ) : null}
                    {error ? <div style={{ fontSize: 12, color: "var(--danger)" }}>{error}</div> : null}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <Button icon="playlist_add" iconPosition="right" onClick={handleAdd} disabled={!invCode || loading}>
                            {loading ? "Přidávám…" : "Přidat do inventury"}
                        </Button>
                        <Button variant="secondary" icon="close" iconPosition="right" onClick={onClose}>
                            Storno
                        </Button>
                    </div>
                </div>
            ) : null}
        </CenteredModal>
    );
}
