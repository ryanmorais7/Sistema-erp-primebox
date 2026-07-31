import { prisma } from "@/lib/prisma";
import { PedidoForm } from "@/components/pedidos/pedido-form";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

export default async function NovoPedidoPage() {
  const [clientes, produtos] = await Promise.all([
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

  const produtosComPrecoNumero = produtos.map((produto) => ({
    ...produto,
    preco: Number(produto.preco),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Novo pedido" />
      <PedidoForm clientes={clientes} produtos={produtosComPrecoNumero} />
    </div>
  );
}
