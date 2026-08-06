import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FichaTecnica } from "@/components/produtos/ficha-tecnica";
import { PageHeader } from "@/components/layout/page-header";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function FichaTecnicaProdutoPage({ params }: PageProps) {
  const { id } = await params;

  const [produto, materiasPrimasAtivas, consumos] = await Promise.all([
    prisma.produto.findUnique({ where: { id } }),
    prisma.materiaPrima.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.consumoMateriaPrima.findMany({
      where: { produtoId: id },
      include: { materiaPrima: true },
      orderBy: { materiaPrima: { nome: "asc" } },
    }),
  ]);

  if (!produto) {
    notFound();
  }

  const consumosFormatados = consumos.map((consumo) => ({
    id: consumo.id,
    materiaPrimaId: consumo.materiaPrimaId,
    materiaPrimaNome: consumo.materiaPrima.nome,
    unidade: consumo.materiaPrima.unidade,
    quantidade: Number(consumo.quantidade),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Ficha técnica · ${produto.nome}`} />
      <FichaTecnica
        produtoId={produto.id}
        materiasPrimas={materiasPrimasAtivas}
        consumosIniciais={consumosFormatados}
      />
    </div>
  );
}
