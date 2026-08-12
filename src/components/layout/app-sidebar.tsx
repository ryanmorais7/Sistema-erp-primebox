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
  Truck,
  Search,
  CalendarDays,
  KeyRound,
  LogOut,
} from "lucide-react";

import { logout } from "@/app/login/actions";
import type { PapelUsuario } from "@/lib/session";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const papelLabels: Record<PapelUsuario, string> = {
  DESENVOLVEDOR: "Desenvolvedor",
  ADMINISTRADOR: "Administrador",
  FUNCIONARIO: "Funcionário",
};

const itensComercial = [
  { href: "/", label: "Painel", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
];

const itensFabrica = [
  { href: "/producao", label: "Produção", icon: Factory },
  { href: "/estoque", label: "Estoque", icon: Warehouse },
  { href: "/expedicao", label: "Expedição", icon: Truck },
];

const itensRelatorios = [
  { href: "/relatorios/clientes", label: "Por cliente", icon: Search },
  { href: "/relatorios/faturamento", label: "Faturamento por período", icon: CalendarDays },
];

type AppSidebarProps = {
  usuario: { nome: string; papel: PapelUsuario };
};

export function AppSidebar({ usuario }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="gap-0 px-2 py-4">
        <div className="flex items-center gap-2 px-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Box className="size-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-sm font-semibold text-sidebar-foreground">
              PrimeBox
            </span>
            <span className="font-mono text-[0.65rem] tracking-wider text-sidebar-foreground/60 uppercase">
              Sistema de gestão
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono tracking-wider uppercase">
            Comercial
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {itensComercial.map((item) => (
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="font-mono tracking-wider uppercase">
            Fábrica
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {itensFabrica.map((item) => (
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="font-mono tracking-wider uppercase">
            Relatórios
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {itensRelatorios.map((item) => (
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-dashed border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{usuario.nome}</p>
            <p className="font-mono text-[0.65rem] tracking-wider text-sidebar-foreground/50 uppercase">
              {papelLabels[usuario.papel]}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              render={<Link href="/trocar-senha" />}
              nativeButton={false}
              variant="ghost"
              size="icon-sm"
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
              aria-label="Trocar senha"
              title="Trocar senha"
            >
              <KeyRound />
            </Button>
            <form action={logout}>
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
                aria-label="Sair"
                title="Sair"
              >
                <LogOut />
              </Button>
            </form>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
