"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PrimaryNav } from "./PrimaryNav";
import { SignOutButton } from "./SignOutButton";
import { getCustomerContext } from "@/modules/customer/customer.actions";
import styles from "./AppShell.module.css";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldRenderShell = pathname ? !pathname.startsWith("/auth") && !pathname.startsWith("/acesso-negado") : false;
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  const customerShell = shouldRenderShell && !isAdmin && !pathname?.startsWith("/operacao");
  const [customerEstablishment, setCustomerEstablishment] = useState("Estabelecimento ativo");
  const [customerEstablishments, setCustomerEstablishments] = useState<{ id: string; name: string }[]>([]);
  const [customerEstablishmentId, setCustomerEstablishmentId] = useState("");
  useEffect(() => {
    if (!customerShell) return;
    let active = true;
    void getCustomerContext().then((result) => {
      if (active && result.ok) {
        setCustomerEstablishments(result.establishments);
        setCustomerEstablishmentId(result.selected?.id ?? "");
        if (result.selected?.name) setCustomerEstablishment(result.selected.name);
      }
    });
    return () => { active = false; };
  }, [customerShell, pathname]);
  if (!shouldRenderShell) return <>{children}</>;

  const navProfile = isAdmin
    ? "PLATFORM_ADMIN" as const
    : pathname?.startsWith("/operacao/entregas")
      ? "DRIVER" as const
      : pathname?.startsWith("/operacao")
        ? "INTERNAL_OPERATOR" as const
        : undefined;
  const showCustomerNotifications = !navProfile;
  const catalogRoute = customerShell && pathname === "/catalogo";
  const adminWorkspaceLabel = pathname === "/admin/empresas" || pathname?.startsWith("/admin/empresas/")
    ? "Administração / Empresas"
    : pathname?.startsWith("/admin/produtos") || pathname?.startsWith("/admin/categorias")
      ? "Administração / Produtos"
      : pathname?.startsWith("/admin/pedidos")
        ? "Administração / Pedidos"
        : "Administração";
  const selectCatalogEstablishment = (value: string) => {
    setCustomerEstablishmentId(value);
    const selected = customerEstablishments.find(item => item.id === value);
    if (selected) setCustomerEstablishment(selected.name);
    window.dispatchEvent(new CustomEvent("farta:catalog-establishment", { detail: value }));
  };
  const updateCatalogSearch = (value: string) => {
    window.dispatchEvent(new CustomEvent("farta:catalog-search", { detail: value }));
  };
  const workspaceLabel = isAdmin ? "Administração" : pathname?.startsWith("/operacao") ? "Operação" : "Área de trabalho";

  return <div className={`${styles.shell} ${customerShell ? styles.customerShell : ""}`}>
    <a className={styles.skipLink} href="#main-content">Pular para o conteúdo</a>
    <aside className={styles.sidebar}>
      <Link className={styles.sidebarBrand} href="/" aria-label="Farta, início"><Image src="/farta-logo-light.png" alt="" width={188} height={188} priority /></Link>
      <PrimaryNav profile={navProfile} />
      <p className={styles.tagline}>Tudo para o seu negócio</p>
    </aside>
    <div className={styles.workspace}>
      <header className={styles.header}>
        <Link className={styles.mobileBrand} href="/" aria-label="Farta, início"><Image src="/farta-logo.png" alt="" width={48} height={48} priority /><span>Farta</span></Link>
        {catalogRoute ? <div className={styles.customerWorkspaceLabel}>
          <small>Comprando para</small>
          {customerEstablishments.length > 0 ? <select aria-label="Estabelecimento da compra" value={customerEstablishmentId} onChange={event => selectCatalogEstablishment(event.target.value)}>
            {customerEstablishments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select> : <strong>{customerEstablishment}</strong>}
        </div> : customerShell ? <div className={styles.customerWorkspaceLabel}><small>Comprando para</small><strong>{customerEstablishment}</strong></div> : <span className={styles.workspaceLabel}>{isAdmin ? adminWorkspaceLabel : workspaceLabel}</span>}
        {catalogRoute && <label className={styles.customerSearch}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg><input type="search" aria-label="Buscar produto, marca ou embalagem" placeholder="Busque por produto, marca ou embalagem" onChange={event => updateCatalogSearch(event.target.value)} /></label>}
        <div className={styles.actions}>{showCustomerNotifications && <Link className={styles.notificationLink} href="/notificacoes" aria-label="Abrir notificações"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg><span>Notificações</span></Link>}<Link className={styles.profileLink} href="/perfil" aria-label="Abrir meu perfil"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21c.7-4 3.2-6 7.5-6s6.8 2 7.5 6" /></svg><span>Meu perfil</span></Link><SignOutButton className={styles.signOutButton} /></div>
      </header>
      <main id="main-content" className={styles.content}>{children}</main>
    </div>
  </div>;
}
