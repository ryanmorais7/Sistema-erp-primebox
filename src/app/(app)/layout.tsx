import { verificarSessao } from "@/lib/dal";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessao = await verificarSessao();

  return (
    <SidebarProvider>
      <div className="print:hidden">
        <AppSidebar usuario={{ nome: sessao.nome, papel: sessao.papel }} />
      </div>
      <SidebarInset>
        <header className="flex items-center border-b px-4 py-3 md:hidden print:hidden">
          <SidebarTrigger />
        </header>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8 print:max-w-none print:p-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
