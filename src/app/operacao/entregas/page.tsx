import { requireCompanyOperator } from '@/modules/admin/admin.context';
import { listCompanyOrders } from '@/modules/admin/admin.actions';
import { OrdersQueue } from '@/app/admin/pedidos/orders-queue';

export default async function DriverDeliveriesPage() {
  const profile = await requireCompanyOperator();
  if (profile.role !== 'DRIVER') {
    const { redirect } = await import('next/navigation');
    redirect('/operacao/pedidos');
  }
  const result = await listCompanyOrders('DISPATCHED');
  return <OrdersQueue scope="driver" initial={result.ok ? result.orders : []} initialError={result.ok ? '' : result.message} />;
}
