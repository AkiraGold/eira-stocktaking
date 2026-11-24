"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useSelectedInventura } from "@/hooks/useSelectedInventura";
import { isInventuraActive } from "@/utils/inventuraEventStates";
import { stocktakingListPath, scanPath, HOME_PATH } from "@/utils/inventoryNavigation";

export const BOTTOM_NAV_HEIGHT = 64;
export const PROFILE_PATH = "/profile";
const STOCKTAKING_PICKER_PATH = "/stocktakingList";
const BASE_ITEMS_PATH = "/base-items";

/** Dolní lišta je jen na hlavních obrazovkách, ne ve formulářích, detailu a skeneru. */
export function isBottomNavVisible(pathname) {
    if (!pathname) return false;
    if ([HOME_PATH, STOCKTAKING_PICKER_PATH, BASE_ITEMS_PATH, PROFILE_PATH].includes(pathname)) return true;
    return /^\/stocktakingList\/\d+\/?$/.test(pathname);
}

function NavItem({ href, icon, label, active }) {
    return (
        <Link
            href={href}
            aria-current={active ? "page" : undefined}
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                textDecoration: "none",
                color: active ? "var(--accent)" : "var(--muted)",
                fontSize: 10,
                fontWeight: 600,
                lineHeight: 1.15,
                minWidth: 0,
            }}
        >
            <span
                className="material-icons-round"
                aria-hidden="true"
                style={{ fontSize: 22, lineHeight: 1, display: "block", width: 22, height: 22, textAlign: "center" }}
            >
                {icon}
            </span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{label}</span>
        </Link>
    );
}

export default function BottomNav() {
    const pathname = usePathname();
    const { selectedInventura } = useSelectedInventura();
    const visible = isBottomNavVisible(pathname);
    const active = isInventuraActive(selectedInventura);
    const navRef = useRef(null);

    useEffect(() => {
        const root = document.documentElement;
        if (!visible) {
            root.style.setProperty("--bottom-nav-h", "0px");
            return;
        }

        const sync = () => {
            const h = navRef.current?.getBoundingClientRect().height;
            root.style.setProperty("--bottom-nav-h", h ? `${Math.ceil(h)}px` : `${BOTTOM_NAV_HEIGHT}px`);
        };
        sync();
        window.addEventListener("resize", sync);
        return () => window.removeEventListener("resize", sync);
    }, [visible]);

    if (!visible) return null;

    const listHref = active ? stocktakingListPath(selectedInventura.id) : STOCKTAKING_PICKER_PATH;
    const scanHref = active ? scanPath(selectedInventura.id) : STOCKTAKING_PICKER_PATH;
    const onList = /^\/stocktakingList(\/\d+)?\/?$/.test(pathname);

    return (
        <nav
            ref={navRef}
            aria-label="Hlavní navigace"
            style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 150,
                overflow: "visible",
                background: "var(--surface)",
                borderTop: "1px solid var(--line)",
                boxShadow: "0 -8px 24px rgba(0,0,0,0.25)",
                padding: "10px 4px calc(14px + env(safe-area-inset-bottom, 0px))",
            }}
        >
            <div
                className="container"
                style={{
                    margin: "0 auto",
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    alignItems: "end",
                    position: "relative",
                    overflow: "visible",
                }}
            >
                <NavItem href={HOME_PATH} icon="home" label="Přehled" active={pathname === HOME_PATH} />
                <NavItem href={listHref} icon="checklist" label="Inventura" active={onList} />
                <div style={{ position: "relative" }}>
                    <Link
                        href={scanHref}
                        aria-label="Skenovat QR"
                        style={{
                            position: "absolute",
                            left: "50%",
                            bottom: 0,
                            transform: "translateX(-50%)",
                            width: 52,
                            height: 52,
                            borderRadius: 16,
                            background: "var(--accent)",
                            color: "var(--accent-ink)",
                            display: "grid",
                            placeItems: "center",
                            boxShadow: "0 6px 14px -6px rgba(0,0,0,0.5)",
                            textDecoration: "none",
                        }}
                    >
                        <span
                            className="material-icons-round"
                            aria-hidden="true"
                            style={{ fontSize: 24, lineHeight: 1, display: "block" }}
                        >
                            qr_code_scanner
                        </span>
                    </Link>
                </div>
                <NavItem href={BASE_ITEMS_PATH} icon="inventory_2" label="Majetek" active={pathname === BASE_ITEMS_PATH} />
                <NavItem href={PROFILE_PATH} icon="person" label="Profil" active={pathname === PROFILE_PATH} />
            </div>
        </nav>
    );
}
