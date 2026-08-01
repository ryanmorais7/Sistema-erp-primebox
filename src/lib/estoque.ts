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
