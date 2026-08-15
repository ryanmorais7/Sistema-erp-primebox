import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditarItemAvulsaForm } from "@/components/producao/editar-item-avulsa-form";
import { formatarPrecoBr } from "@/lib/validations/moeda";
import { PageHeader } from "@/components/layout/page-header";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarItemAvulsaPage({ params }: PageProps) {
  const { id } = await params;

  const item = await prisma.itemOrdemAvulsa.findUnique({
    where: { id },
    include: { produto: true },
  });

  if (!item) {
    notFound();
  }
  // Só dá pra editar antes de iniciar produção — depois disso os dados
  // já podem ter refletido em estoque/produção real (ver
  // atualizarItemOrdemAvulsa).
  if (item.status !== "AGUARDANDO") {
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
      <PageHeader title={`Editar OP Avulsa`} />
      <EditarItemAvulsaForm
        itemId={item.id}
        valoresIniciais={{
          produtoId: item.produtoId,
          produtoTexto: item.produto.nome,
          quantidade: item.quantidade,
          clienteTexto: item.clienteTexto,
          clienteId: item.clienteId ?? undefined,
          observacao: item.observacao ?? "",
          precoUnitario: item.precoUnitario ? formatarPrecoBr(Number(item.precoUnitario)) : "",
          dataProgramada: item.dataProgramada ? item.dataProgramada.toISOString().slice(0, 10) : "",
        }}
        produtos={produtosComPrecoNumero}
        clientes={clientes}
        medidas={medidas}
      />
    </div>
  );
}
