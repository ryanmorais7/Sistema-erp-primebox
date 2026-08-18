import { prisma } from "@/lib/prisma";

// Saldo = soma das entradas - soma das saídas. Calculado a partir do
// histórico de movimentos (não guardamos um saldo denormalizado), para
// nunca dessincronizar entre o total e os lançamentos individuais.

export async function calcularSaldosProdutos(): Promise<Map<string, number>> {
  const grupos = await prisma.movimentoEstoqueProduto.groupBy({
    by: ["produtoId", "tipo"],
    _sum: { quantidade: true },
  });
  return acumularSaldos(grupos.map((g) => ({ id: g.produtoId, tipo: g.tipo, soma: g._sum.quantidade })));
}

export async function calcularSaldoProduto(produtoId: string): Promise<number> {
  const saldos = await calcularSaldosProdutos();
  return saldos.get(produtoId) ?? 0;
}

export async function calcularSaldosMateriasPrimas(): Promise<Map<string, number>> {
  const grupos = await prisma.movimentoEstoqueMateriaPrima.groupBy({
    by: ["materiaPrimaId", "tipo"],
    _sum: { quantidade: true },
  });
  return acumularSaldos(
    grupos.map((g) => ({ id: g.materiaPrimaId, tipo: g.tipo, soma: g._sum.quantidade })),
  );
}

export async function calcularSaldoMateriaPrima(materiaPrimaId: string): Promise<number> {
  const saldos = await calcularSaldosMateriasPrimas();
  return saldos.get(materiaPrimaId) ?? 0;
}

// Matérias-primas com saldo abaixo do próprio estoqueMinimo (ou
// negativo) — usado tanto pelo indicador persistente em Produção
// quanto pelo aviso inline na criação de OP.
export async function listarInsumosAbaixoDoMinimo(): Promise<
  { id: string; nome: string; saldo: number; estoqueMinimo: number }[]
> {
  const [materiasPrimas, saldos] = await Promise.all([
    prisma.materiaPrima.findMany({ where: { ativo: true } }),
    calcularSaldosMateriasPrimas(),
  ]);
  return materiasPrimas
    .map((mp) => ({
      id: mp.id,
      nome: mp.nome,
      saldo: saldos.get(mp.id) ?? 0,
      estoqueMinimo: Number(mp.estoqueMinimo),
    }))
    .filter((mp) => mp.saldo < mp.estoqueMinimo);
}

// Baixa automática de insumo (matéria-prima) pela ficha técnica —
// acontece uma única vez, no momento de CRIAR a OP (formal ou avulsa),
// nunca em "Feito" ou na conclusão (ver ADR sobre baixa automática de
// insumo). Produto sem ficha técnica cadastrada: não baixa nada, OP
// criada normalmente. Nunca bloqueia por saldo insuficiente — só
// retorna quais insumos ficaram abaixo do mínimo depois da baixa, pra
// quem chamou decidir se mostra aviso.
export async function darBaixaInsumos(
  produtoId: string,
  quantidade: number,
  rotuloOP: string,
): Promise<{ avisos: string[] }> {
  const fichaTecnica = await prisma.consumoMateriaPrima.findMany({
    where: { produtoId },
    include: { materiaPrima: true },
  });
  if (fichaTecnica.length === 0) {
    return { avisos: [] };
  }

  const avisos: string[] = [];
  for (const consumo of fichaTecnica) {
    const consumido = Number(consumo.quantidade) * quantidade;
    await prisma.movimentoEstoqueMateriaPrima.create({
      data: {
        materiaPrimaId: consumo.materiaPrimaId,
        tipo: "SAIDA",
        quantidade: consumido,
        observacao: `Baixa automática na criação — ${rotuloOP}`,
      },
    });

    const saldoAtual = await calcularSaldoMateriaPrima(consumo.materiaPrimaId);
    const minimo = Number(consumo.materiaPrima.estoqueMinimo);
    if (saldoAtual < minimo) {
      avisos.push(
        `${consumo.materiaPrima.nome} — saldo ${saldoAtual} ${consumo.materiaPrima.unidade} (mínimo ${minimo})`,
      );
    }
  }
  return { avisos };
}

// Estorna darBaixaInsumos — usado ao cancelar uma OP, em qualquer
// status (Aguardando, Em produção ou Concluído), já que a baixa
// acontece na criação, não na conclusão.
export async function estornarInsumos(produtoId: string, quantidade: number, rotuloOP: string) {
  const fichaTecnica = await prisma.consumoMateriaPrima.findMany({ where: { produtoId } });
  for (const consumo of fichaTecnica) {
    await prisma.movimentoEstoqueMateriaPrima.create({
      data: {
        materiaPrimaId: consumo.materiaPrimaId,
        tipo: "ENTRADA",
        quantidade: Number(consumo.quantidade) * quantidade,
        observacao: `Estorno de baixa — cancelamento da ${rotuloOP}`,
      },
    });
  }
}

// Entrada do produto acabado no estoque — só isso acontece na
// conclusão da produção agora (baixa de insumo já aconteceu na
// criação, ver darBaixaInsumos).
export async function darEntradaProdutoAcabado(
  produtoId: string,
  quantidade: number,
  rotuloOP: string,
) {
  await prisma.movimentoEstoqueProduto.create({
    data: {
      produtoId,
      tipo: "ENTRADA",
      quantidade,
      observacao: `Produção concluída — ${rotuloOP}`,
    },
  });
}

// Estorna darEntradaProdutoAcabado — usado ao cancelar/voltar uma OP
// que já tinha sido concluída. Sempre lança movimentos novos em vez de
// apagar os antigos, pra manter o histórico rastreável.
export async function estornarEntradaProdutoAcabado(
  produtoId: string,
  quantidade: number,
  rotuloOP: string,
) {
  await prisma.movimentoEstoqueProduto.create({
    data: {
      produtoId,
      tipo: "SAIDA",
      quantidade,
      observacao: `Cancelamento de produção já concluída — ${rotuloOP}`,
    },
  });
}

function acumularSaldos(
  grupos: { id: string; tipo: "ENTRADA" | "SAIDA"; soma: unknown }[],
): Map<string, number> {
  const saldos = new Map<string, number>();
  for (const grupo of grupos) {
    const atual = saldos.get(grupo.id) ?? 0;
    const valor = Number(grupo.soma ?? 0);
    saldos.set(grupo.id, atual + (grupo.tipo === "ENTRADA" ? valor : -valor));
  }
  return saldos;
}
