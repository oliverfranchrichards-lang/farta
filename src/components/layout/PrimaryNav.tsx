"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { defaultNavProfile, navByProfile, type NavProfile } from "./nav-config";
import styles from "./PrimaryNav.module.css";

const iconPaths: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5M5.5 9v10h13V9M9 19v-6h6v6", catalog: "M4 5h16M4 10h16M4 15h10M4 20h7",
  orders: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5", delivery: "M3 6h11v10H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  inventory: "M4 7.5 12 3l8 4.5v9L12 21l-8-4.5zM4 7.5l8 4.5 8-4.5M12 12v9", support: "M4 5h16v11H8l-4 4zM8 9h8M8 12h5",
};

function NavIcon({ name }: { name: string }) { return <svg aria-hidden="true" className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={iconPaths[name] ?? iconPaths.home} /></svg>; }

export function PrimaryNav({ profile = defaultNavProfile }: { profile?: NavProfile }) {
  const pathname = usePathname(); const [open, setOpen] = useState(false); const navRef = useRef<HTMLElement>(null); const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) navRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); toggleRef.current?.focus(); } };
    const closeOnOutside = (event: PointerEvent) => { const target = event.target as Node; if (open && !navRef.current?.contains(target) && !toggleRef.current?.contains(target)) setOpen(false); };
    document.addEventListener("keydown", closeOnEscape); document.addEventListener("pointerdown", closeOnOutside);
    return () => { document.removeEventListener("keydown", closeOnEscape); document.removeEventListener("pointerdown", closeOnOutside); };
  }, [open]);
  return <><button ref={toggleRef} type="button" className={styles.toggle} onClick={() => setOpen(value => !value)} aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} aria-controls="primary-navigation"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={open ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} /></svg></button><nav ref={navRef} id="primary-navigation" className={`${styles.nav} ${open ? styles.open : ""}`} aria-label="Navegação principal">{navByProfile[profile].map(item => { const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`)); return <Link key={`${item.href}-${item.label}`} href={item.href} className={active ? `${styles.link} ${styles.active}` : styles.link} aria-current={active ? "page" : undefined} aria-label={item.label} onClick={() => setOpen(false)}><NavIcon name={item.icon} /><span>{item.label}</span></Link>; })}</nav></>;
}
