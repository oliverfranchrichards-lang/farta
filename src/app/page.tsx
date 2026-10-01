import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function Home() {
  const current = await getCurrentUser();
  if (!current) redirect("/auth/login");
  if (current.profile.role === "PLATFORM_ADMIN") redirect("/admin/empresas");
  if (current.profile.role === "INTERNAL_OPERATOR") redirect("/operacao/pedidos");
  if (current.profile.role === "DRIVER") redirect("/operacao/entregas");
  redirect("/catalogo");
}
