"use client";

import { installOfflineFetch } from "@/offline/offlineFetch";

// Obal fetch se musí nainstalovat dřív, než komponenty začnou volat server,
// proto už při načtení modulu (efekty potomků běží dřív než efekty rodiče).
if (typeof window !== "undefined") installOfflineFetch();

export default function OfflineBoot() {
    return null;
}
