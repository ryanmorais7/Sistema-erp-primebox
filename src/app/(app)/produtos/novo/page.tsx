import { prisma } from "@/lib/prisma";
import { ProdutoForm } from "@/components/produtos/produto-form";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

export default async function NovoProdutoPage() {
  const medidas = await prisma.medida.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Novo produto" />
      <ProdutoForm medidas={medidas} />
    </div>
  );
}
