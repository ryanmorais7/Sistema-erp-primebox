import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditarGrupoAvulsaForm } from "@/components/producao/editar-grupo-avulsa-form";
import { formatarPrecoBr } from "@/lib/validations/moeda";
import { PageHeader } from "@/components/layout/page-header";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ ordemAvulsaId: string }>;
};

// Edita de uma vez todos os itens em "Aguardando" da mesma OP avulsa —
// mesmo card que aparece agrupado no board.
export default async function EditarGrupoAvulsaPage({ params }: PageProps) {
  const { ordemAvulsaId } = await params;

  const ordemAvulsa = await prisma.ordemAvulsa.findUnique({
    where: { id: ordemAvulsaId },
    include: { itens: { include: { produto: true }, orderBy: { createdAt: "asc" } } },
  });

  if (!ordemAvulsa) {
    notFound();
  }

  const itensEditaveis = ordemAvulsa.itens.filter((item) => item.status === "AGUARDANDO");
  if (itensEditaveis.length === 0) {
    redirect("/producao");
  }

  const [produtos, clientes, medidas] = await Promise.all([
    prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, preco: true },
    }),
    prisma.cliente.findMany({
      where: { ativo: true },
      orderBy: { razaoSocial: "asc" },
      select: { id: true, razaoSocial: true, nomeFantasia: true },
    }),
    prisma.medida.findMany({
      where: { ativo: true },
      orderBy: { ordem: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  const produtosComPrecoNumero = produtos.map((produto) => ({
    ...produto,
    preco: Number(produto.preco),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Editar OP Avulsa #${ordemAvulsa.numero}`} />
      <EditarGrupoAvulsaForm
        valoresIniciais={{
          linhas: itensEditaveis.map((item) => ({
            itemId: item.id,
            produtoId: item.produtoId,
            produtoTexto: item.produto.nome,
            quantidade: item.quantidade,
            clienteTexto: item.clienteTexto,
            clienteId: item.clienteId ?? undefined,
            observacao: item.observacao ?? "",
            precoUnitario: item.precoUnitario ? formatarPrecoBr(Number(item.precoUnitario)) : "",
            dataProgramada: item.dataProgramada ? item.dataProgramada.toISOString().slice(0, 10) : "",
          })),
        }}
        produtos={produtosComPrecoNumero}
        clientes={clientes}
        medidas={medidas}
      />
    </div>
  );
}
