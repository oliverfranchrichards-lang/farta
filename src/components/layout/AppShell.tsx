"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PrimaryNav } from "./PrimaryNav";
import { SignOutButton } from "./SignOutButton";
import styles from "./AppShell.module.css";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldRenderShell = pathname ? !pathname.startsWith("/auth") && !pathname.startsWith("/acesso-negado") : false;
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  if (!shouldRenderShell) return <>{children}</>;

  const navProfile = isAdmin
    ? "PLATFORM_ADMIN" as const
    : pathname?.startsWith("/operacao/entregas")
      ? "DRIVER" as const
      : pathname?.startsWith("/operacao")
        ? "INTERNAL_OPERATOR" as const
        : undefined;
  const showCustomerNotifications = !navProfile;

  return <div className={styles.shell}>
    <a className={styles.skipLink} href="#main-content">Pular para o conteúdo</a>
    <aside className={styles.sidebar}>
      <Link className={styles.sidebarBrand} href="/" aria-label="Farta, início"><Image src="/farta-logo-light.png" alt="" width={188} height={188} priority /></Link>
      <PrimaryNav profile={navProfile} />
      <p className={styles.tagline}>Tudo para o seu negócio</p>
    </aside>
    <div className={styles.workspace}>
      <header className={styles.header}>
        <Link className={styles.mobileBrand} href="/" aria-label="Farta, início"><Image src="/farta-logo.png" alt="" width={48} height={48} priority /><span>Farta</span></Link>
        <span className={styles.workspaceLabel}>Área de trabalho</span>
        <div className={styles.actions}>{showCustomerNotifications && <Link className={styles.notificationLink} href="/notificacoes" aria-label="Abrir notificações">Notificações</Link>}<Link className={styles.profileLink} href="/perfil">Meu perfil</Link><SignOutButton /></div>
      </header>
      <main id="main-content" className={styles.content}>{children}</main>
    </div>
  </div>;
}
