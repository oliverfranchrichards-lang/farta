import { requireCustomerPage } from "@/lib/auth/current-user";

export default async function OrdersLayout({ children }: { children: React.ReactNode }) {
  await requireCustomerPage();
  return children;
}
