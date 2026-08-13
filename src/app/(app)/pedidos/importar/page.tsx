import { prisma } from "@/lib/prisma";
import { ImportarPlanilhaForm } from "@/components/pedidos/importar-planilha-form";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

export default async function ImportarPlanilhaPage() {
  const medidas = await prisma.medida.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Importar planilha" />
      <ImportarPlanilhaForm medidas={medidas} />
    </div>
  );
}
