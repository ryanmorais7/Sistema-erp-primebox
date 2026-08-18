import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verificarSessao } from "@/lib/dal";
import { ReciboLinha } from "@/components/producao/recibo-linha";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const formatadorDataHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });
// UTC fixo: dataProgramada é uma coluna @db.Date (só data, sem hora), e
// formatar no fuso local poderia voltar um dia (meia-noite UTC vira dia
// anterior em fusos negativos como o do Brasil).
const formatadorDataProgramada = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeZone: "UTC",
});

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
      titulo={`Recibo · OP #${item.ordemAvulsa.numero}`}
      numeroLabel={`OP #${item.ordemAvulsa.numero}`}
      dataFormatada={
        item.dataProgramada
          ? formatadorDataProgramada.format(item.dataProgramada)
          : formatadorDataHora.format(item.ordemAvulsa.createdAt)
      }
      clienteNome={item.clienteTexto}
      itens={[
        {
          produtoNome: item.produto.nome,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario != null ? Number(item.precoUnitario) : null,
          observacao: item.observacao,
        },
      ]}
      representanteNome={sessao.nome}
      autoImprimir={false}
    />
  );
}
