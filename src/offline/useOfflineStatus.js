"use client";

import { useEffect, useState } from "react";
import { OFFLINE_STATUS_EVENT, getOfflineStatus } from "@/offline/offlineFetch";

/** Stav připojení a fronty změn pro komponenty. */
export function useOfflineStatus() {
    const [status, setStatus] = useState(() =>
        typeof window === "undefined"
            ? { online: true, pending: 0, syncing: false, conflicts: [], downloading: null }
            : getOfflineStatus()
    );
    useEffect(() => {
        const onChange = (e) => setStatus(e.detail || getOfflineStatus());
        window.addEventListener(OFFLINE_STATUS_EVENT, onChange);
        return () => window.removeEventListener(OFFLINE_STATUS_EVENT, onChange);
    }, []);
    return status;
}
