import { requireCompanyOperator } from '@/modules/admin/admin.context';
import { listCompanyOrders } from '@/modules/admin/admin.actions';
import { OrdersQueue } from '@/app/admin/pedidos/orders-queue';
import { redirect } from 'next/navigation';

export default async function CompanyOrdersPage() {
  const profile = await requireCompanyOperator();
  if (profile.role === 'DRIVER') redirect('/operacao/entregas');
  const result = await listCompanyOrders();
  return <OrdersQueue scope="company" initial={result.ok ? result.orders : []} initialError={result.ok ? '' : result.message} />;
}
