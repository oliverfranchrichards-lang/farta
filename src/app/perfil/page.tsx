import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { getCurrentUser } from '@/lib/auth/current-user';
import { redirect } from 'next/navigation';
import { ProfileForm } from './profile-form';
import styles from './profile.module.css';

const roleLabels: Record<string, string> = {
  CUSTOMER: 'Cliente',
  INTERNAL_OPERATOR: 'Operador interno',
  DRIVER: 'Entregador',
  PLATFORM_ADMIN: 'Administrador da plataforma',
};

export default async function ProfilePage() {
  const current = await getCurrentUser();
  if (!current) redirect('/auth/login');
  return <main className={styles.page}>
    <PageHeader eyebrow="MINHA CONTA" title="Meu perfil" description="Mantenha seus dados de contato atualizados para facilitar o atendimento da operação." />
    <div className={styles.grid}>
      <Card className={styles.summary}>
        <p className={styles.eyebrow}>DADOS DA CONTA</p>
        <h2>{current.profile.full_name || 'Usuário'}</h2>
        <p>{current.user.email}</p>
        <span className={styles.role}>{roleLabels[current.profile.role] ?? current.profile.role}</span>
        {current.profile.role === 'CUSTOMER' && current.company?.display_name && <p className={styles.company}>Empresa: {current.company.display_name}</p>}
      </Card>
      <Card>
        <ProfileForm initialPhone={current.profile.phone} />
      </Card>
    </div>
  </main>;
}
