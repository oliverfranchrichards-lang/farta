import { requireCustomerPage } from "@/lib/auth/current-user";

export default async function CatalogLayout({ children }: { children: React.ReactNode }) {
  await requireCustomerPage();
  return children;
}
