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

export default async function ReciboFormalPage({ params }: PageProps) {
  const { id } = await params;
  const sessao = await verificarSessao();

  // O botão "Gerar recibo" em /producao passa o id da OrdemProducao (é o
  // identificador usado pelas outras ações do card nesse fluxo), não o
  // do ItemPedido — busca por aqui pra não desalinhar.
  const ordem = await prisma.ordemProducao.findUnique({
    where: { id },
    include: {
      itemPedido: {
        include: {
          produto: { include: { medida: true } },
          pedido: { include: { cliente: true } },
        },
      },
    },
  });

  if (!ordem) {
    notFound();
  }
  const item = ordem.itemPedido;

  const nomeExibido = item.pedido.cliente.nomeFantasia || item.pedido.cliente.razaoSocial;
  const documento = formatarDocumento(item.pedido.cliente.cnpj, item.pedido.cliente.cpf);
  const clienteSecundaria = [
    item.pedido.cliente.nomeFantasia ? item.pedido.cliente.razaoSocial : null,
    documento,
    item.pedido.cliente.telefone,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ReciboLinha
      titulo={`Recibo · Pedido #${item.pedido.numero}`}
      numeroLabel={`OP #${ordem.numero}`}
      dataFormatada={
        ordem.dataProgramada
          ? formatadorDataProgramada.format(ordem.dataProgramada)
          : formatadorDataHora.format(item.pedido.createdAt)
      }
      clienteNome={nomeExibido}
      clienteSecundaria={clienteSecundaria || null}
      clienteEndereco={formatarEndereco(item.pedido.cliente)}
      itens={[
        {
          produtoNome: item.produto.nome,
          quantidade: item.quantidade,
          precoUnitario: Number(item.precoUnitario),
        },
      ]}
      observacaoGeral={item.pedido.observacoes}
      representanteNome={sessao.nome}
      autoImprimir={false}
    />
  );
}
