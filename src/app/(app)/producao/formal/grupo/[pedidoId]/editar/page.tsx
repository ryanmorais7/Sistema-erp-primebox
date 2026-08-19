import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditarGrupoPedidoForm } from "@/components/producao/editar-grupo-pedido-form";
import { formatarPrecoBr } from "@/lib/validations/moeda";
import { PageHeader } from "@/components/layout/page-header";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ pedidoId: string }>;
};

// Edita de uma vez todas as OrdemProducao em "Aguardando" do mesmo
// Pedido — mesmo card que aparece agrupado no board.
export default async function EditarGrupoPedidoPage({ params }: PageProps) {
  const { pedidoId } = await params;

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: {
      cliente: true,
      itens: {
        include: { ordemProducao: true },
        orderBy: { ordem: "asc" },
      },
    },
  });

  if (!pedido) {
    notFound();
  }

  const itensEditaveis = pedido.itens.filter((item) => item.ordemProducao?.status === "AGUARDANDO");
  if (itensEditaveis.length === 0) {
    redirect("/producao");
  }

  const [produtos, medidas] = await Promise.all([
    prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, preco: true },
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
      <PageHeader title={`Editar Pedido #${pedido.numero}`} />
      <EditarGrupoPedidoForm
        clienteNome={pedido.cliente.nomeFantasia || pedido.cliente.razaoSocial}
        valoresIniciais={{
          linhas: itensEditaveis.map((item) => ({
            itemId: item.ordemProducao!.id,
            produtoId: item.produtoId,
            produtoTexto: item.produtoTexto,
            quantidade: item.quantidade,
            precoUnitario: formatarPrecoBr(Number(item.precoUnitario)),
            custoUnitario: formatarPrecoBr(Number(item.custoUnitario)),
            dataProgramada: item.ordemProducao!.dataProgramada
              ? item.ordemProducao!.dataProgramada.toISOString().slice(0, 10)
              : "",
          })),
        }}
        produtos={produtosComPrecoNumero}
        medidas={medidas}
      />
    </div>
  );
}
