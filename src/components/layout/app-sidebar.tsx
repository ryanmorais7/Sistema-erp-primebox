"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  Factory,
  Warehouse,
  Wallet,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const itensOperacao = [
  { href: "/", label: "Painel", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/produtos", label: "Produtos", icon: Package },
];

const itemPedidos = { label: "Pedidos", icon: ClipboardList };

const proximasFases = [
  { label: "Produção", icon: Factory },
  { label: "Estoque", icon: Warehouse },
  { label: "Financeiro", icon: Wallet },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="gap-0 px-2 py-4">
        <div className="flex items-center gap-2 px-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Box className="size-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">PrimeBox</span>
            <span className="text-[0.65rem] tracking-wider text-sidebar-foreground/60 uppercase">
              Sistema de gestão
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {itensOperacao.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton disabled>
                  <itemPedidos.icon />
                  <span>{itemPedidos.label}</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>em breve</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Próximas fases</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {proximasFases.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton disabled>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>em breve</SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 py-3 text-[0.7rem] text-sidebar-foreground/50">
        <p>v0.1 · MVP</p>
        <p>PrimeBox · uso interno</p>
      </SidebarFooter>
    </Sidebar>
  );
}
