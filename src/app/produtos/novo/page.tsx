import { prisma } from "@/lib/prisma";
import { ProdutoForm } from "@/components/produtos/produto-form";

export const dynamic = "force-dynamic";

export default async function NovoProdutoPage() {
  const medidas = await prisma.medida.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Novo produto</h1>
      <ProdutoForm medidas={medidas} />
    </div>
  );
}
