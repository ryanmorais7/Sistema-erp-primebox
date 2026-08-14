import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calcularSaldoProduto } from "@/lib/estoque";
import { CriarPedidoEstoqueForm } from "@/components/estoque/criar-pedido-estoque-form";
import { PageHeader } from "@/components/layout/page-header";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CriarPedidoEstoquePage({ params }: PageProps) {
  const { id } = await params;

  const [produto, saldoAtual, clientes] = await Promise.all([
    prisma.produto.findUnique({ where: { id } }),
    calcularSaldoProduto(id),
    prisma.cliente.findMany({
      where: { ativo: true },
      orderBy: { razaoSocial: "asc" },
      select: { id: true, razaoSocial: true, nomeFantasia: true },
    }),
  ]);

  if (!produto || saldoAtual <= 0) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Criar pedido do estoque: ${produto.nome}`} />
      <CriarPedidoEstoqueForm
        produtoId={produto.id}
        produtoNome={produto.nome}
        precoUnitario={Number(produto.preco)}
        saldoAtual={saldoAtual}
        clientes={clientes}
      />
    </div>
  );
}
