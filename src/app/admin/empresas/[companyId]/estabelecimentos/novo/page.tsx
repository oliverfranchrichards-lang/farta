import Link from "next/link";
import { requirePlatformAdmin } from "@/modules/admin/admin.context";
import { EstablishmentForm } from "./establishment-form";
import styles from "../../../../admin.module.css";

export default async function NewEstablishmentPage({ params }: { params: Promise<{ companyId: string }> }) {
  await requirePlatformAdmin();
  const { companyId } = await params;
  return <main className={styles.page}><div className={styles.breadcrumb}><Link href="/admin/empresas">Administração</Link> <span aria-hidden="true">›</span> <Link href={`/admin/empresas/${companyId}/estabelecimentos`}>Estabelecimentos</Link> <span aria-hidden="true">›</span> Novo</div><header className={styles.header}><div><h1>Cadastrar estabelecimento</h1><p>Informe os dados do novo estabelecimento da empresa selecionada.</p></div></header><EstablishmentForm companyId={companyId} /></main>;
}
