/**
 * Vývojářské volby (např. zpomalení načítání obrázků) se zobrazují jen při vývoji,
 * nebo když je při sestavení nastaveno NEXT_PUBLIC_SHOW_DEV_SETTINGS=true.
 */
export const SHOW_DEV_SETTINGS =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_SHOW_DEV_SETTINGS === "true";
