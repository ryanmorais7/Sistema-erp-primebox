import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProdutoForm } from "@/components/produtos/produto-form";
import { PageHeader } from "@/components/layout/page-header";
import type { ProdutoFormValues } from "@/lib/validations/produto";
import { formatarPrecoBr } from "@/lib/validations/moeda";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarProdutoPage({ params }: PageProps) {
  const { id } = await params;

  const [produto, medidas] = await Promise.all([
    prisma.produto.findUnique({ where: { id } }),
    prisma.medida.findMany({
      where: { ativo: true },
      orderBy: { ordem: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  if (!produto) {
    notFound();
  }

  const valoresIniciais: ProdutoFormValues = {
    nome: produto.nome,
    tipo: produto.tipo,
    medidaId: produto.medidaId,
    tecido: produto.tecido ?? "",
    cor: produto.cor ?? "",
    preco: formatarPrecoBr(Number(produto.preco)),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Editar produto" />
      <ProdutoForm produtoId={produto.id} medidas={medidas} valoresIniciais={valoresIniciais} />
    </div>
  );
}
