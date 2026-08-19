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
    include: {
      cliente: true,
      itens: { include: { ordemProducao: true }, orderBy: { ordem: "asc" } },
    },
  });

  if (!pedido) {
    notFound();
  }

  // Pedido faturado pode ser editado (ver ADR-006, atualizado) — só
  // continua bloqueado se algum item já tem OP (editar recriaria os
  // itens do zero, apagando a OP em cascata, ver ADR-010).
  if (pedido.itens.some((item) => item.ordemProducao)) {
    redirect(`/pedidos/${pedido.id}`);
  }

  const [clientesAtivos, produtosAtivos, medidas] = await Promise.all([
    prisma.cliente.findMany({
      where: { ativo: true },
      orderBy: { razaoSocial: "asc" },
      select: { id: true, razaoSocial: true, nomeFantasia: true },
    }),
    prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, preco: true, custo: true },
    }),
    prisma.medida.findMany({
      where: { ativo: true },
      orderBy: { ordem: "asc" },
      select: { id: true, nome: true },
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

  // Não precisa mais buscar produtos inativos já referenciados pelo
  // pedido — o texto exibido/editado vem direto de item.produtoTexto,
  // nunca do cadastro do produto (ver ADR-035).
  const produtos = produtosAtivos.map((produto) => ({
    ...produto,
    preco: Number(produto.preco),
    custo: Number(produto.custo),
  }));

  const valoresIniciais: PedidoFormValues = {
    clienteId: pedido.clienteId,
    observacoes: pedido.observacoes ?? "",
    formaPagamento: pedido.formaPagamento ?? "",
    itens: pedido.itens.map((item) => ({
      produtoTexto: item.produtoTexto,
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      precoUnitario: formatarPrecoBr(Number(item.precoUnitario)),
      custoUnitario: formatarPrecoBr(Number(item.custoUnitario)),
    })),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Editar pedido #${pedido.numero}`} />
      <PedidoForm
        pedidoId={pedido.id}
        clientes={clientes}
        produtos={produtos}
        medidas={medidas}
        valoresIniciais={valoresIniciais}
      />
    </div>
  );
}
