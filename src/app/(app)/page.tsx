import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dataBr } from "@/lib/data";
import { PainelInterativo } from "@/components/painel/painel-interativo";
import { LinhaPedidoRecente } from "@/components/painel/linha-pedido-recente";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Números ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const NOMES_MES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const NOMES_MES_COMPLETO = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// Horário do Brasil (-03:00 fixo, sem horário de verão desde 2019) —
// mesma convenção de src/lib/data.ts, aplicada ao mês em vez do dia.
function anoMesAtualBr(): { ano: number; mes: number } {
  const ano = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric" }).format(
      new Date(),
    ),
  );
  const mes = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", month: "numeric" }).format(
      new Date(),
    ),
  );
  return { ano, mes };
}

function ultimosMeses(quantidade: number) {
  const { ano: anoAtual, mes: mesAtual } = anoMesAtualBr();
  const meses: { chave: string; label: string; labelCompleto: string; ano: number; mes: number }[] =
    [];
  for (let i = quantidade - 1; i >= 0; i--) {
    let mes = mesAtual - i;
    let ano = anoAtual;
    while (mes <= 0) {
      mes += 12;
      ano -= 1;
    }
    meses.push({
      chave: `${ano}-${String(mes).padStart(2, "0")}`,
      label: NOMES_MES[mes - 1],
      labelCompleto: NOMES_MES_COMPLETO[mes - 1],
      ano,
      mes,
    });
  }
  return meses;
}

function chaveMesBr(data: Date): string {
  const ano = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(data);
  const mes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    month: "2-digit",
  }).format(data);
  return `${ano}-${mes}`;
}

export default async function PainelPage() {
  const meses = ultimosMeses(6);
  const inicioJanela = dataBr(`${meses[0].ano}-${String(meses[0].mes).padStart(2, "0")}-01`);

  const [pedidosRecentes, pedidosCriadosNoPeriodo, faturadosNoPeriodo, avulsosNoPeriodo] =
    await Promise.all([
      prisma.pedido.findMany({
        include: { cliente: true },
        orderBy: { numero: "desc" },
        take: 5,
      }),
      // Base para "pedidos em carteira" e "clientes ativos" por mês —
      // agrupados pela data de criação do pedido.
      prisma.pedido.findMany({
        where: { createdAt: { gte: inicioJanela } },
        select: { createdAt: true, clienteId: true, status: true, valorTotal: true },
      }),
      // faturadoEm é gravado uma única vez em faturarPedido e nunca
      // muda depois, mesmo que o pedido seja editado (ver ADR-009
      // atualizado — antes usava updatedAt, que quebrava se o pedido
      // fosse editado pós-fatura).
      prisma.pedido.findMany({
        where: { status: "FATURADO", faturadoEm: { gte: inicioJanela } },
        select: { faturadoEm: true, valorTotal: true },
      }),
      // OP avulsa concluída também conta como ganho da empresa — mesma
      // convenção usada em "Faturamento por período" (ADR-033).
      prisma.itemOrdemAvulsa.findMany({
        where: { status: "CONCLUIDO", updatedAt: { gte: inicioJanela } },
        select: { updatedAt: true, precoUnitario: true, quantidade: true },
      }),
    ]);

  const clientesPorMes = new Map<string, Set<string>>();
  const carteiraPorMes = new Map<string, { pedidos: number; valor: number }>();
  for (const pedido of pedidosCriadosNoPeriodo) {
    const chave = chaveMesBr(pedido.createdAt);

    const clientes = clientesPorMes.get(chave) ?? new Set<string>();
    clientes.add(pedido.clienteId);
    clientesPorMes.set(chave, clientes);

    if (pedido.status === "EM_CARTEIRA") {
      const atual = carteiraPorMes.get(chave) ?? { pedidos: 0, valor: 0 };
      atual.pedidos += 1;
      atual.valor += Number(pedido.valorTotal);
      carteiraPorMes.set(chave, atual);
    }
  }

  const faturamentoPorMes = new Map<string, { pedidos: number; valor: number }>();
  for (const pedido of faturadosNoPeriodo) {
    const chave = chaveMesBr(pedido.faturadoEm!);
    const atual = faturamentoPorMes.get(chave) ?? { pedidos: 0, valor: 0 };
    atual.pedidos += 1;
    atual.valor += Number(pedido.valorTotal);
    faturamentoPorMes.set(chave, atual);
  }
  for (const item of avulsosNoPeriodo) {
    const chave = chaveMesBr(item.updatedAt);
    const atual = faturamentoPorMes.get(chave) ?? { pedidos: 0, valor: 0 };
    atual.pedidos += 1;
    atual.valor += item.precoUnitario ? Number(item.precoUnitario) * item.quantidade : 0;
    faturamentoPorMes.set(chave, atual);
  }

  const dadosPorMes = meses.map((m) => ({
    chave: m.chave,
    label: m.label,
    labelCompleto: m.labelCompleto,
    pedidosEmCarteira: carteiraPorMes.get(m.chave)?.pedidos ?? 0,
    valorEmCarteira: carteiraPorMes.get(m.chave)?.valor ?? 0,
    pedidosFaturados: faturamentoPorMes.get(m.chave)?.pedidos ?? 0,
    faturamento: faturamentoPorMes.get(m.chave)?.valor ?? 0,
    clientesAtivos: clientesPorMes.get(m.chave)?.size ?? 0,
  }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Painel" />

      <PainelInterativo dadosPorMes={dadosPorMes} />

      <div className="rounded-lg border shadow-[0_2px_8px_rgba(28,35,33,0.06)]">
        <div className="flex items-center justify-between border-b p-4">
          <p className="font-heading text-sm font-semibold">Pedidos recentes</p>
          <Link href="/pedidos" className="text-sm text-muted-foreground hover:text-foreground">
            ver todos
          </Link>
        </div>
        {pedidosRecentes.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhum pedido cadastrado ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosRecentes.map((pedido) => (
                <LinhaPedidoRecente key={pedido.id} href={`/pedidos/${pedido.id}`}>
                  <TableCell className="font-mono">#{pedido.numero}</TableCell>
                  <TableCell className="font-medium">
                    {pedido.cliente.nomeFantasia || pedido.cliente.razaoSocial}
                  </TableCell>
                  <TableCell>{formatadorMoeda.format(Number(pedido.valorTotal))}</TableCell>
                  <TableCell>
                    {pedido.status === "FATURADO" ? (
                      <Badge className="bg-positive-soft text-positive">Faturado</Badge>
                    ) : (
                      <Badge variant="secondary">Em carteira</Badge>
                    )}
                  </TableCell>
                </LinhaPedidoRecente>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
