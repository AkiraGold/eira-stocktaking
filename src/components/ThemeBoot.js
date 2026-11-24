"use client";

import { useEffect } from "react";
import { applyTheme, readStoredTheme, THEME_STORAGE_KEY } from "@/utils/theme";

/** Keeps <html data-theme> in sync with Profil setting / other tabs. */
export default function ThemeBoot() {
  useEffect(() => {
    applyTheme(readStoredTheme());

    const sync = () => applyTheme(readStoredTheme());
    const onStorage = (e) => {
      if (!e || e.key === THEME_STORAGE_KEY || e.key === null) sync();
    };

    window.addEventListener("settings-updated", sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("settings-updated", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
