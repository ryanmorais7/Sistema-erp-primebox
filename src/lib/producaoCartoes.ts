import { prisma } from "@/lib/prisma";
import { tipoProdutoLabels } from "@/lib/validations/produto";
import type { TipoProduto } from "@/generated/prisma/enums";

// Fuso do Brasil, fixo (-03:00, sem horário de verão desde 2019) — usado
// pra "bucketar" itens sem dataProgramada pelo dia de criação (calendário
// do Pedro, não UTC).
const TZ_BR = "America/Sao_Paulo";
const formatadorChaveDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ_BR,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "YYYY-MM-DD" — dataProgramada quando existe (já é um @db.Date em UTC,
// então usa UTC pra não voltar um dia); senão cai pro dia de criação no
// fuso do Brasil. Todo cartão sempre cai em algum dia — não existe mais
// "sem data" na navegação Mês → Dia → OP do dia.
export function chaveDiaCartao(dataProgramada: Date | null, createdAt: Date): string {
  if (dataProgramada) {
    return dataProgramada.toISOString().slice(0, 10);
  }
  return formatadorChaveDia.format(createdAt);
}

export function textoProduto(item: {
  nome: string;
  tipo: TipoProduto;
  tecido: string | null;
  cor: string | null;
  medida: { nome: string };
}) {
  const prefixo = item.tipo === "BASE" ? tipoProdutoLabels[item.tipo] : item.medida.nome;
  // Planilhas importadas às vezes já trazem o prefixo no nome (ex: "Base
  // queen sat 07") — evita duplicar ("Base Base queen sat 07").
  const nomeJaTemPrefixo = item.nome.toLowerCase().startsWith(prefixo.toLowerCase());
  const base = nomeJaTemPrefixo ? item.nome : `${prefixo} ${item.nome}`;
  const tecidoCor = [item.tecido, item.cor].filter(Boolean).join(" ");
  return tecidoCor ? `${base} · ${tecidoCor}` : base;
}

export type Cartao = {
  id: string;
  origem: "formal" | "avulsa";
  numeroLabel: string;
  status: "AGUARDANDO" | "EM_PRODUCAO" | "CONCLUIDO";
  quantidade: number;
  produtoTexto: string;
  clienteLabel: string;
  clienteHref: string | null;
  observacao: string;
  // Preço unitário definido na criação/edição da OP — sempre presente
  // do lado formal (ItemPedido.precoUnitario é obrigatório), opcional
  // do lado avulso (Pedro pode deixar em branco). Só leitura na tela
  // "OP do dia"; edição continua sendo pelo formulário de Editar.
  precoUnitario: number | null;
  // Id da OP inteira (OrdemAvulsa ou Pedido) — usado pra agrupar vários
  // itens da mesma OP num card só, seja no board ou na navegação por
  // dia (ver ADR-033).
  grupoOpId: string;
  createdAt: Date;
  // Confirmação explícita da OP inteira (não é "todo item concluído",
  // é o botão "Marcar como concluída" clicado — ver ADR-033).
  concluidaConfirmada: boolean;
  dataProgramada: Date | null;
  // Controle de pagamento — independente do status Em carteira/Faturado
  // do Pedido (que é sobre faturamento, não sobre o dinheiro ter
  // entrado). Existe pros dois lados, ver ADR-033.
  pago: boolean;
  // Dia (BR) a que esse cartão pertence pra navegação Mês → Dia → OP do
  // dia — ver chaveDiaCartao.
  diaChave: string;
};

function normalizar(texto: string) {
  return texto.trim().toLowerCase();
}

// Busca e monta todos os cartões (formais + avulsos) de produção — usado
// tanto pelo Kanban (/producao/kanban) quanto pela navegação por
// mês/dia/OP do dia (/producao). Uma única fonte de verdade pra não as
// duas telas divergirem sobre o que é uma OP.
export async function buscarCartoesProducao(): Promise<Cartao[]> {
  const [ordens, itensAvulsos] = await Promise.all([
    prisma.ordemProducao.findMany({
      include: {
        itemPedido: {
          include: {
            produto: { include: { medida: true } },
            pedido: { include: { cliente: true } },
          },
        },
      },
      orderBy: { numero: "asc" },
    }),
    prisma.itemOrdemAvulsa.findMany({
      include: {
        produto: { include: { medida: true } },
        ordemAvulsa: true,
        cliente: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const cartoesFormais: Cartao[] = ordens.map((ordem) => ({
    id: ordem.id,
    origem: "formal",
    numeroLabel: `OP #${ordem.numero}`,
    status: ordem.status,
    quantidade: ordem.itemPedido.quantidade,
    produtoTexto: textoProduto(ordem.itemPedido.produto),
    clienteLabel:
      ordem.itemPedido.pedido.cliente.nomeFantasia || ordem.itemPedido.pedido.cliente.razaoSocial,
    clienteHref: `/pedidos/${ordem.itemPedido.pedido.id}`,
    observacao: ordem.itemPedido.pedido.observacoes || "",
    precoUnitario: Number(ordem.itemPedido.precoUnitario),
    grupoOpId: ordem.itemPedido.pedidoId,
    createdAt: ordem.createdAt,
    concluidaConfirmada: ordem.itemPedido.pedido.concluidaConfirmada,
    dataProgramada: ordem.dataProgramada,
    pago: ordem.itemPedido.pago,
    diaChave: chaveDiaCartao(ordem.dataProgramada, ordem.createdAt),
  }));

  const cartoesAvulsos: Cartao[] = itensAvulsos.map((item) => ({
    id: item.id,
    origem: "avulsa",
    numeroLabel: `OP #${item.ordemAvulsa.numero}`,
    status: item.status,
    quantidade: item.quantidade,
    produtoTexto: textoProduto(item.produto),
    clienteLabel: item.clienteTexto,
    clienteHref: item.clienteId ? `/clientes/${item.clienteId}/editar` : null,
    observacao: item.observacao || "",
    precoUnitario: item.precoUnitario ? Number(item.precoUnitario) : null,
    grupoOpId: item.ordemAvulsaId,
    createdAt: item.createdAt,
    concluidaConfirmada: item.ordemAvulsa.concluidaConfirmada,
    dataProgramada: item.dataProgramada,
    pago: item.pago,
    diaChave: chaveDiaCartao(item.dataProgramada, item.createdAt),
  }));

  return [...cartoesFormais, ...cartoesAvulsos].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

// Cor alternada (peach/teal) trocando toda vez que o cliente muda,
// andando na ordem dada — dá uma pista visual de "essas linhas são do
// mesmo cliente" numa lista corrida, sem precisar de um cabeçalho
// separando grupos (ver ADR-033, reversão do agrupamento por OP).
export function coresAlternadasPorCliente(cartoes: Cartao[]): Map<string, "peach" | "teal"> {
  const cores = new Map<string, "peach" | "teal">();
  let clienteAnterior: string | null = null;
  let indice = -1;
  for (const cartao of cartoes) {
    if (cartao.clienteLabel !== clienteAnterior) {
      indice++;
      clienteAnterior = cartao.clienteLabel;
    }
    cores.set(`${cartao.origem}-${cartao.id}`, indice % 2 === 0 ? "peach" : "teal");
  }
  return cores;
}

export { normalizar };
