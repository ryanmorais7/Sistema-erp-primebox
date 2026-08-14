import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verificarSessao } from "@/lib/dal";
import { ReciboLinha } from "@/components/producao/recibo-linha";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReciboAvulsaPage({ params }: PageProps) {
  const { id } = await params;
  const sessao = await verificarSessao();

  const item = await prisma.itemOrdemAvulsa.findUnique({
    where: { id },
    include: { produto: { include: { medida: true } }, ordemAvulsa: true },
  });

  if (!item) {
    notFound();
  }

  return (
    <ReciboLinha
      titulo={`Recibo · OP Avulsa #${item.ordemAvulsa.numero}`}
      numeroLabel={`OP Avulsa #${item.ordemAvulsa.numero}`}
      data={item.ordemAvulsa.createdAt}
      clienteNome={item.clienteTexto}
      produtoNome={item.produto.nome}
      medidaNome={item.produto.medida.nome}
      tecidoCor={[item.produto.tecido, item.produto.cor].filter(Boolean).join(" / ") || null}
      quantidade={item.quantidade}
      precoUnitario={item.precoUnitario != null ? Number(item.precoUnitario) : null}
      observacao={item.observacao}
      representanteNome={sessao.nome}
      autoImprimir={false}
    />
  );
}
