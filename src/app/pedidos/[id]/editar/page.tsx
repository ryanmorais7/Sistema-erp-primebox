import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PedidoForm } from "@/components/pedidos/pedido-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import type { PedidoFormValues } from "@/lib/validations/pedido";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarPedidoPage({ params }: PageProps) {
  const { id } = await params;

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { cliente: true, itens: { include: { produto: true } } },
  });

  if (!pedido) {
    notFound();
  }

  if (pedido.status === "FATURADO") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={`Pedido #${pedido.numero}`}
          action={<Badge className="bg-positive-soft text-positive">Faturado</Badge>}
        />
        <p className="text-muted-foreground">
          Este pedido já foi faturado e não pode mais ser editado.
        </p>
        <div className="rounded-lg border p-4">
          <p className="font-medium">
            {pedido.cliente.nomeFantasia || pedido.cliente.razaoSocial}
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
            {pedido.itens.map((item) => (
              <li key={item.id}>
                {item.quantidade}x {item.produto.nome} —{" "}
                {formatadorMoeda.format(Number(item.precoUnitario) * item.quantidade)}
              </li>
            ))}
          </ul>
          <p className="mt-3 font-medium">
            Total: {formatadorMoeda.format(Number(pedido.valorTotal))}
          </p>
        </div>
      </div>
    );
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
  const produtosDosItens = pedido.itens
    .filter((item) => !produtosAtivosIds.has(item.produtoId))
    .map((item) => ({ id: item.produto.id, nome: item.produto.nome, preco: item.produto.preco }));

  const produtos = [...produtosAtivos, ...produtosDosItens].map((produto) => ({
    ...produto,
    preco: Number(produto.preco),
  }));

  const valoresIniciais: PedidoFormValues = {
    clienteId: pedido.clienteId,
    itens: pedido.itens.map((item) => ({
      produtoId: item.produtoId,
      quantidade: item.quantidade,
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
