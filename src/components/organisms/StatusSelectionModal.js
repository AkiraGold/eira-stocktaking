import React, { useState } from "react";
import CenteredModal from "../molecules/CenteredModal";
import Button from "../atoms/Button";
import { useInventoryStates } from "@/hooks/useInventoryStates";
import { INVENTORY_STATES } from "@/utils/inventoryStates";

export default function StatusSelectionModal({ 
    isOpen, 
    onClose, 
    onStatusSelect, 
    itemName 
}) {
    const statusOptions = useInventoryStates();
    const [selectedStatus, setSelectedStatus] = useState(INVENTORY_STATES.FOUND);

    const handleConfirm = () => {
        const status = statusOptions.find(opt => opt.value === selectedStatus);
        onStatusSelect(status);
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    return (
        <CenteredModal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Stav položky"
            width="90vw"
        >
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
                <div style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 500 }}>
                    Vyberte stav pro položku: <strong style={{ color: "var(--fg)" }}>{itemName}</strong>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {statusOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setSelectedStatus(option.value)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                                padding: "0.75rem",
                                border: selectedStatus === option.value ? "2px solid var(--accent)" : "1px solid var(--line)",
                                borderRadius: "8px",
                                background: selectedStatus === option.value ? "var(--surface-2)" : "var(--surface)",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                                fontWeight: "500",
                                textAlign: "left",
                                width: "100%",
                                transition: "all 0.2s ease",
                                color: "var(--fg)"
                            }}
                            onMouseEnter={(e) => {
                                if (selectedStatus !== option.value) {
                                    e.target.style.backgroundColor = "var(--surface-2)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedStatus !== option.value) {
                                    e.target.style.backgroundColor = "var(--surface)";
                                }
                            }}
                        >
                            <span style={{ fontWeight: selectedStatus === option.value ? 600 : 500 }}>
                                {option.label}
                            </span>
                        </button>
                    ))}
                </div>
                
                <div style={{ 
                    display: "flex", 
                    gap: "0.5rem", 
                    justifyContent: "flex-end", 
                    paddingTop: "0.75rem", 
                    borderTop: "1px solid var(--line)", 
                    marginTop: "0.75rem"
                }}>
                    <Button 
                        variant="secondary" 
                        icon="close" 
                        iconPosition="right" 
                        onClick={handleCancel}
                    >
                        Zrušit
                    </Button>
                    <Button 
                        icon="check" 
                        iconPosition="right" 
                        onClick={handleConfirm}
                    >
                        Potvrdit
                    </Button>
                </div>
            </div>
        </CenteredModal>
    );
}
