import { useState, useRef } from 'react';
import { clearAllInventuraEphemeralCaches } from '@/utils/inventuraCache';
import { notifySelectedInventuraChanged } from '@/utils/inventuraDisplayMode';

function inventuraId(value) {
    if (value?.id == null) return null;
    const n = Number(value.id);
    return Number.isFinite(n) ? n : null;
}

function readSelectedInventura() {
    if (typeof window === 'undefined') return null;
    try {
        const saved = localStorage.getItem('selectedInventura');
        if (!saved) return null;
        return JSON.parse(saved);
    } catch (e) {
        console.error('Failed to parse selected inventura:', e);
        return null;
    }
}

export function useSelectedInventura() {
    const [selectedInventura, setSelectedInventura] = useState(readSelectedInventura);
    const [ready] = useState(true);
    const activeInventuraIdRef = useRef(inventuraId(selectedInventura));

    const selectInventura = (inventura) => {
        const nextId = inventuraId(inventura);
        const prevId = activeInventuraIdRef.current;
        if (nextId != null && prevId !== nextId) {
            clearAllInventuraEphemeralCaches();
        }
        activeInventuraIdRef.current = nextId;
        setSelectedInventura(inventura);
        localStorage.setItem('selectedInventura', JSON.stringify(inventura));
        notifySelectedInventuraChanged();
    };

    const clearSelectedInventura = () => {
        clearAllInventuraEphemeralCaches();
        activeInventuraIdRef.current = null;
        setSelectedInventura(null);
        localStorage.removeItem('selectedInventura');
        notifySelectedInventuraChanged();
    };

    return {
        selectedInventura,
        selectInventura,
        clearSelectedInventura,
        ready,
    };
}
