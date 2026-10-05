export type NavProfile = "CUSTOMER" | "INTERNAL_OPERATOR" | "DRIVER" | "PLATFORM_ADMIN";
export type NavItem = { href: string; label: string; icon: "home" | "catalog" | "orders" | "delivery" | "inventory" | "support" };

export const navByProfile: Record<NavProfile, NavItem[]> = {
  CUSTOMER: [
    { href: "/", label: "Início", icon: "home" },
    { href: "/catalogo", label: "Comprar", icon: "catalog" },
    { href: "/pedidos", label: "Pedidos", icon: "orders" },
    { href: "/mensagens", label: "Mensagens", icon: "support" },
  ],
  INTERNAL_OPERATOR: [
    { href: "/", label: "Visão geral", icon: "home" },
    { href: "/operacao/pedidos", label: "Pedidos", icon: "orders" },
    { href: "/mensagens", label: "Mensagens", icon: "support" },
  ],
  DRIVER: [{ href: "/operacao/entregas", label: "Entregas", icon: "delivery" }, { href: "/mensagens", label: "Mensagens", icon: "support" }],
  PLATFORM_ADMIN: [
    { href: "/admin/empresas", label: "Empresas", icon: "home" },
    { href: "/admin/pedidos", label: "Pedidos", icon: "orders" },
    { href: "/admin/produtos", label: "Produtos", icon: "inventory" },
    { href: "/admin/banners", label: "Banners", icon: "support" },
  ],
};

export const defaultNavProfile: NavProfile = "CUSTOMER";
