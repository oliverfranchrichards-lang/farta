import { requireCustomerPage } from "@/lib/auth/current-user";

export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  await requireCustomerPage();
  return children;
}
