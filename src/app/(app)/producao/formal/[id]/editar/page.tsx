import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditarItemPedidoForm } from "@/components/producao/editar-item-pedido-form";
import { formatarPrecoBr } from "@/lib/validations/moeda";
import { PageHeader } from "@/components/layout/page-header";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarOrdemProducaoPage({ params }: PageProps) {
  const { id } = await params;

  const ordem = await prisma.ordemProducao.findUnique({
    where: { id },
    include: { itemPedido: { include: { pedido: { include: { cliente: true } } } } },
  });

  if (!ordem) {
    notFound();
  }
  // Só dá pra editar antes de iniciar produção — depois disso os dados já
  // podem ter refletido em estoque/produção real (ver atualizarOrdemProducao).
  if (ordem.status !== "AGUARDANDO") {
    redirect("/producao");
  }

  const item = ordem.itemPedido;
  const cliente = item.pedido.cliente;

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
      <PageHeader title={`Editar OP #${ordem.numero}`} />
      <EditarItemPedidoForm
        ordemId={ordem.id}
        clienteNome={cliente.nomeFantasia || cliente.razaoSocial}
        valoresIniciais={{
          produtoId: item.produtoId,
          produtoTexto: item.produtoTexto,
          quantidade: item.quantidade,
          precoUnitario: formatarPrecoBr(Number(item.precoUnitario)),
          custoUnitario: formatarPrecoBr(Number(item.custoUnitario)),
          dataProgramada: ordem.dataProgramada ? ordem.dataProgramada.toISOString().slice(0, 10) : "",
        }}
        produtos={produtosComPrecoNumero}
        medidas={medidas}
      />
    </div>
  );
}
