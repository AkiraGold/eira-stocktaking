export const THEME = {
  SYSTEM: "system",
  LIGHT: "light",
  DARK: "dark",
};

export const THEME_STORAGE_KEY = "settings_theme";

export function readStoredTheme() {
  if (typeof window === "undefined") return THEME.SYSTEM;
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === THEME.LIGHT || v === THEME.DARK || v === THEME.SYSTEM) return v;
  } catch (_e) {
    /* ignore */
  }
  return THEME.SYSTEM;
}

/** Apply theme to <html data-theme>. system = remove attribute (OS decides). */
export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === THEME.LIGHT || theme === THEME.DARK) {
    root.setAttribute("data-theme", theme);
  } else {
    root.removeAttribute("data-theme");
  }
}
