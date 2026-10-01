import { requirePlatformAdmin } from '@/modules/admin/admin.context';
import { listAdminOrders } from '@/modules/admin/admin.actions';
import { OrdersQueue } from './orders-queue';

export default async function AdminOrdersPage() {
  await requirePlatformAdmin();
  const result = await listAdminOrders();
  return <OrdersQueue initial={result.ok ? result.orders : []} initialError={result.ok ? '' : result.message} />;
}
