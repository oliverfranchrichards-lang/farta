import Link from "next/link";
import { requirePlatformAdmin } from "@/modules/admin/admin.context";
import { CompanyForm } from "./company-form";
import styles from "../../admin.module.css";

export default async function NewCompanyPage() {
  await requirePlatformAdmin();
  return <main className={styles.page}><div className={styles.breadcrumb}><Link href="/admin/empresas">Administração</Link> <span aria-hidden="true">›</span> Nova empresa</div><header className={styles.header}><div><h1>Cadastrar empresa</h1><p>Adicione uma empresa para organizar seus estabelecimentos e acessos.</p></div></header><CompanyForm /></main>;
}
