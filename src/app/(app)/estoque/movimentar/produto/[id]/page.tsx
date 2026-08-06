import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calcularSaldoProduto } from "@/lib/estoque";
import { registrarMovimentoProduto } from "@/app/(app)/estoque/actions";
import { MovimentoForm } from "@/components/estoque/movimento-form";
import { PageHeader } from "@/components/layout/page-header";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MovimentarProdutoPage({ params }: PageProps) {
  const { id } = await params;

  const produto = await prisma.produto.findUnique({ where: { id } });
  if (!produto) {
    notFound();
  }

  const saldoAtual = await calcularSaldoProduto(id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Movimentar estoque: ${produto.nome}`} />
      <MovimentoForm
        titulo="Registrar movimentação"
        saldoAtual={saldoAtual}
        aoRegistrar={registrarMovimentoProduto.bind(null, id)}
      />
    </div>
  );
}
