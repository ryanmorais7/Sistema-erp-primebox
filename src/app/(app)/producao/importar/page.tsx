import { prisma } from "@/lib/prisma";
import { ImportarPlanilhaProducaoForm } from "@/components/producao/importar-planilha-producao-form";
import { PageHeader } from "@/components/layout/page-header";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

export default async function ImportarPlanilhaProducaoPage() {
  const medidas = await prisma.medida.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Importar planilha" />
      <ImportarPlanilhaProducaoForm medidas={medidas} />
    </div>
  );
}
