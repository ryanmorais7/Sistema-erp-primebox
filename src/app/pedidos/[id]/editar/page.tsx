import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PedidoForm } from "@/components/pedidos/pedido-form";
import { PageHeader } from "@/components/layout/page-header";
import type { PedidoFormValues } from "@/lib/validations/pedido";
import { formatarPrecoBr } from "@/lib/validations/moeda";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarPedidoPage({ params }: PageProps) {
  const { id } = await params;

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { cliente: true, itens: { include: { ordemProducao: true } } },
  });

  if (!pedido) {
    notFound();
  }

  if (pedido.status === "FATURADO" || pedido.itens.some((item) => item.ordemProducao)) {
    redirect(`/pedidos/${pedido.id}`);
  }

  const [clientesAtivos, produtosAtivos] = await Promise.all([
    prisma.cliente.findMany({
      where: { ativo: true },
      orderBy: { razaoSocial: "asc" },
      select: { id: true, razaoSocial: true, nomeFantasia: true },
    }),
    prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, preco: true },
    }),
  ]);

  const clientes = clientesAtivos.some((cliente) => cliente.id === pedido.clienteId)
    ? clientesAtivos
    : [
        {
          id: pedido.cliente.id,
          razaoSocial: pedido.cliente.razaoSocial,
          nomeFantasia: pedido.cliente.nomeFantasia,
        },
        ...clientesAtivos,
      ];

  const produtosAtivosIds = new Set(produtosAtivos.map((produto) => produto.id));
  const produtosDosItensFaltantes = pedido.itens.filter(
    (item) => !produtosAtivosIds.has(item.produtoId),
  );
  const produtosFaltantes =
    produtosDosItensFaltantes.length > 0
      ? await prisma.produto.findMany({
          where: { id: { in: produtosDosItensFaltantes.map((item) => item.produtoId) } },
          select: { id: true, nome: true, preco: true },
        })
      : [];

  const produtos = [...produtosAtivos, ...produtosFaltantes].map((produto) => ({
    ...produto,
    preco: Number(produto.preco),
  }));

  const valoresIniciais: PedidoFormValues = {
    clienteId: pedido.clienteId,
    observacoes: pedido.observacoes ?? "",
    itens: pedido.itens.map((item) => ({
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      precoUnitario: formatarPrecoBr(Number(item.precoUnitario)),
    })),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Editar pedido #${pedido.numero}`} />
      <PedidoForm
        pedidoId={pedido.id}
        clientes={clientes}
        produtos={produtos}
        valoresIniciais={valoresIniciais}
      />
    </div>
  );
}
