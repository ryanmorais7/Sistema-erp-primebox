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
  params: Promise<{ ordemAvulsaId: string }>;
};

// Recibo com todos os itens de uma OP avulsa juntos (em vez de um por
// item) — pra não precisar imprimir vários papéis separados quando o
// Pedro vendeu mais de um produto pro mesmo cliente na mesma OP.
export default async function ReciboAvulsaGrupoPage({ params }: PageProps) {
  const { ordemAvulsaId } = await params;
  const sessao = await verificarSessao();

  const ordemAvulsa = await prisma.ordemAvulsa.findUnique({
    where: { id: ordemAvulsaId },
    include: { itens: { include: { produto: { include: { medida: true } } } } },
  });

  if (!ordemAvulsa || ordemAvulsa.itens.length === 0) {
    notFound();
  }

  const clientesDistintos = [...new Set(ordemAvulsa.itens.map((item) => item.clienteTexto))];
  const clienteNome = clientesDistintos.length === 1 ? clientesDistintos[0] : clientesDistintos.join(" · ");

  const dataProgramadas = [
    ...new Set(
      ordemAvulsa.itens
        .map((item) => item.dataProgramada?.getTime())
        .filter((v): v is number => v != null),
    ),
  ];
  const dataProgramadaComum = dataProgramadas.length === 1 ? new Date(dataProgramadas[0]) : null;

  return (
    <ReciboLinha
      titulo={`Recibo · OP #${ordemAvulsa.numero}`}
      numeroLabel={`OP #${ordemAvulsa.numero}`}
      dataFormatada={
        dataProgramadaComum
          ? formatadorDataProgramada.format(dataProgramadaComum)
          : formatadorDataHora.format(ordemAvulsa.createdAt)
      }
      clienteNome={clienteNome}
      itens={ordemAvulsa.itens.map((item) => ({
        produtoNome: item.produto.nome,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario != null ? Number(item.precoUnitario) : null,
        observacao: item.observacao,
      }))}
      representanteNome={sessao.nome}
      autoImprimir={false}
    />
  );
}
