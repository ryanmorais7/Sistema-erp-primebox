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
  params: Promise<{ pedidoId: string }>;
};

function formatarDocumento(cnpj: string | null, cpf: string | null) {
  if (cnpj) return `CNPJ ${cnpj}`;
  if (cpf) return `CPF ${cpf}`;
  return null;
}

function formatarEndereco(cliente: {
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
}) {
  const partes = [
    [cliente.endereco, cliente.numero].filter(Boolean).join(", "),
    cliente.bairro,
    [cliente.cidade, cliente.estado].filter(Boolean).join("/"),
    cliente.cep,
  ].filter(Boolean);
  return partes.length ? partes.join(", ") : null;
}

// Recibo com todos os itens de um Pedido formal juntos — mesmo racional
// do recibo agrupado da OP avulsa, ver ADR-033.
export default async function ReciboFormalGrupoPage({ params }: PageProps) {
  const { pedidoId } = await params;
  const sessao = await verificarSessao();

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: {
      cliente: true,
      itens: { include: { ordemProducao: true }, orderBy: { ordem: "asc" } },
    },
  });

  if (!pedido || pedido.itens.length === 0) {
    notFound();
  }

  const nomeExibido = pedido.cliente.nomeFantasia || pedido.cliente.razaoSocial;
  const documento = formatarDocumento(pedido.cliente.cnpj, pedido.cliente.cpf);
  const clienteSecundaria = [
    pedido.cliente.nomeFantasia ? pedido.cliente.razaoSocial : null,
    documento,
    pedido.cliente.telefone,
  ]
    .filter(Boolean)
    .join(" · ");

  const dataProgramadas = [
    ...new Set(
      pedido.itens
        .map((item) => item.ordemProducao?.dataProgramada?.getTime())
        .filter((v): v is number => v != null),
    ),
  ];
  const dataProgramadaComum = dataProgramadas.length === 1 ? new Date(dataProgramadas[0]) : null;

  return (
    <ReciboLinha
      titulo={`Recibo · Pedido #${pedido.numero}`}
      numeroLabel={`Pedido #${pedido.numero}`}
      dataFormatada={
        dataProgramadaComum
          ? formatadorDataProgramada.format(dataProgramadaComum)
          : formatadorDataHora.format(pedido.createdAt)
      }
      clienteNome={nomeExibido}
      clienteSecundaria={clienteSecundaria || null}
      clienteEndereco={formatarEndereco(pedido.cliente)}
      itens={pedido.itens.map((item) => ({
        produtoNome: item.produtoTexto,
        quantidade: item.quantidade,
        precoUnitario: Number(item.precoUnitario),
      }))}
      observacaoGeral={pedido.observacoes}
      representanteNome={sessao.nome}
      autoImprimir={false}
    />
  );
}
