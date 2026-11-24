import React from "react";
import CenteredModal from "../molecules/CenteredModal";
import ButtonGroup from "../atoms/ButtonGroup";
import Button from "../atoms/Button";
import { useSettings } from "@/hooks/useSettings";
import { INVENTORY_DISPLAY_MODE } from "@/utils/inventoryStates";
import { SHOW_DEV_SETTINGS } from "@/utils/devFlags";
import { THEME } from "@/utils/theme";

const yesNoOptions = [
    { value: false, label: "Ne", icon: "close" },
    { value: true, label: "Ano", icon: "check" },
];

const inventoryModeOptions = [
    { value: INVENTORY_DISPLAY_MODE.FULL, label: "Úplný", icon: "view_list" },
    { value: INVENTORY_DISPLAY_MODE.WORKFLOW, label: "Pracovní", icon: "task_alt" },
];

const themeOptions = [
    { value: THEME.SYSTEM, label: "Systém", icon: "contrast" },
    { value: THEME.LIGHT, label: "Světlý", icon: "light_mode" },
    { value: THEME.DARK, label: "Tmavý", icon: "dark_mode" },
];

/** Obsah nastavení. Změny se ukládají hned (Profil i okno Nastavení). */
export function SettingsForm() {
    const {
        inventoryDisplayMode,
        setInventoryDisplayMode,
        inventoryDisplayModeLocked,
        imageDebugDelayEnabled,
        setImageDebugDelayEnabled,
        imageDebugDelayMs,
        setImageDebugDelayMs,
        itemsPerPage,
        setItemsPerPage,
        scanAutoMarkFound,
        setScanAutoMarkFound,
        scanFeedback,
        setScanFeedback,
        theme,
        setTheme,
    } = useSettings();

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 500 }}>Vzhled</div>
                    <ButtonGroup
                        options={themeOptions}
                        value={theme}
                        onChange={setTheme}
                        iconPosition="left"
                        orientation="horizontal"
                    />
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontStyle: "italic", lineHeight: "1.4" }}>
                        Systém: podle telefonu. Světlý / Tmavý: vynutí režim v aplikaci.
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 500 }}>Režim inventury</div>
                    {/* Zamčený řádek se ukáže až po aktivaci řízení režimu z EIRA (krok 5). */}
                    {inventoryDisplayModeLocked ? (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "12px 14px",
                                borderRadius: 12,
                                background: 'var(--surface)',
                                border: "1px solid var(--line)",
                                fontSize: 14,
                                color: "var(--fg)",
                            }}
                        >
                            <span className="material-icons-round" aria-hidden="true" style={{ fontSize: 20, color: "var(--muted)" }}>
                                lock
                            </span>
                            <span>
                                <b>{inventoryDisplayMode === INVENTORY_DISPLAY_MODE.WORKFLOW ? "Pracovní" : "Úplný"}</b>
                                {" · určuje vybraná inventura v EIRA"}
                            </span>
                        </div>
                    ) : (
                    <ButtonGroup
                        options={inventoryModeOptions}
                        value={inventoryDisplayMode}
                        onChange={setInventoryDisplayMode}
                        iconPosition="left"
                        orientation="horizontal"
                    />
                    )}
                    <div
                        style={{
                            fontSize: "0.75rem",
                            color: "var(--muted)",
                            fontStyle: "italic",
                            lineHeight: "1.4",
                        }}
                    >
                        Úplný: vše včetně položek ve stavu Nezkontrolováno. Pracovní: tyto položky se v seznamu
                        nezobrazují a ve filtru stavu nejsou k dispozici.
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 500 }}>
                        Po skenu rovnou označit jako nalezeno
                    </div>
                    <ButtonGroup
                        options={yesNoOptions}
                        value={scanAutoMarkFound}
                        onChange={setScanAutoMarkFound}
                        iconPosition="left"
                        orientation="horizontal"
                    />
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontStyle: "italic", lineHeight: "1.4" }}>
                        Ano: předmět ze správné místnosti se po naskenování označí sám a lze to vrátit zpět.
                        Ne: nález potvrdíte tlačítkem. Přesun a předmět mimo inventuru se potvrzují vždy.
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 500 }}>
                        Zvuk a vibrace při skenu
                    </div>
                    <ButtonGroup
                        options={yesNoOptions}
                        value={scanFeedback}
                        onChange={setScanFeedback}
                        iconPosition="left"
                        orientation="horizontal"
                    />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 500 }}>
                        Počet položek na stránku:
                    </div>
                    <ButtonGroup
                        options={[
                            { value: 10, label: "10" },
                            { value: 20, label: "20" },
                            { value: 30, label: "30" },
                            { value: 50, label: "50" },
                        ]}
                        value={itemsPerPage}
                        onChange={setItemsPerPage}
                        iconPosition="left"
                        orientation="horizontal"
                    />
                    <div
                        style={{
                            fontSize: "0.75rem",
                            color: "var(--muted)",
                            fontStyle: "italic",
                            lineHeight: "1.4",
                        }}
                    >
                        Ovlivní stránkování seznamů (inventury, položky, vyhledávání majetku).
                    </div>
                </div>

                {SHOW_DEV_SETTINGS && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 500 }}>
                        Dev: Zpomalení načítání obrázků
                    </div>
                    <ButtonGroup
                        options={yesNoOptions}
                        value={imageDebugDelayEnabled}
                        onChange={setImageDebugDelayEnabled}
                        iconPosition="left"
                        orientation="horizontal"
                    />
                    {imageDebugDelayEnabled && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <input
                                type="range"
                                min={0}
                                max={3000}
                                step={100}
                                value={imageDebugDelayMs}
                                onChange={(e) => setImageDebugDelayMs(Number(e.target.value))}
                            />
                            <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                                Zpoždění: {imageDebugDelayMs} ms
                            </div>
                        </div>
                    )}
                    <div
                        style={{
                            fontSize: "0.75rem",
                            color: "var(--muted)",
                            fontStyle: "italic",
                            lineHeight: "1.4",
                        }}
                    >
                        Používá se pro testování skeleton/no-image stavů.
                    </div>
                </div>
                )}
        </div>
    );
}

export default function SettingsModal({ isOpen, onClose }) {


    const handleSave = () => {
        onClose();
    };

    return (
        <CenteredModal isOpen={isOpen} onClose={onClose} title="Nastavení" width="90vw">
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
                <SettingsForm />
                <div
                    style={{
                        display: "flex",
                        gap: "0.5rem",
                        justifyContent: "flex-end",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid var(--line)",
                        marginTop: "0.75rem",
                    }}
                >
                    <Button variant="secondary" icon="close" iconPosition="right" onClick={onClose}>
                        Zrušit
                    </Button>
                    <Button icon="check" iconPosition="right" onClick={handleSave}>
                        Uložit
                    </Button>
                </div>
            </div>
        </CenteredModal>
    );
}
