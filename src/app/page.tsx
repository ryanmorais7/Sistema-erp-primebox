import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dataBr } from "@/lib/data";
import { GraficoFaturamento } from "@/components/painel/grafico-faturamento";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  const meses: { chave: string; label: string; ano: number; mes: number }[] = [];
  for (let i = quantidade - 1; i >= 0; i--) {
    let mes = mesAtual - i;
    let ano = anoAtual;
    while (mes <= 0) {
      mes += 12;
      ano -= 1;
    }
    meses.push({ chave: `${ano}-${String(mes).padStart(2, "0")}`, label: NOMES_MES[mes - 1], ano, mes });
  }
  return meses;
}

function chaveMesBr(data: Date): string {
  const ano = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric" }).format(
    data,
  );
  const mes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    month: "2-digit",
  }).format(data);
  return `${ano}-${mes}`;
}

export default async function PainelPage() {
  const meses = ultimosMeses(6);
  const inicioJanela = dataBr(`${meses[0].ano}-${String(meses[0].mes).padStart(2, "0")}-01`);

  const [
    clientesAtivos,
    pedidosEmCarteira,
    pedidosFaturados,
    valorEmCarteira,
    pedidosRecentes,
    faturadosNoPeriodo,
  ] = await Promise.all([
    prisma.cliente.count({ where: { ativo: true } }),
    prisma.pedido.count({ where: { status: "EM_CARTEIRA" } }),
    prisma.pedido.count({ where: { status: "FATURADO" } }),
    prisma.pedido.aggregate({
      where: { status: "EM_CARTEIRA" },
      _sum: { valorTotal: true },
    }),
    prisma.pedido.findMany({
      include: { cliente: true },
      orderBy: { numero: "desc" },
      take: 5,
    }),
    // updatedAt é a data de faturamento: um pedido faturado nunca mais
    // é editado, então o momento da transição pra FATURADO é confiável
    // (mesma convenção do relatório de faturamento por dia, ver ADR-009).
    prisma.pedido.findMany({
      where: { status: "FATURADO", updatedAt: { gte: inicioJanela } },
      select: { updatedAt: true, valorTotal: true },
    }),
  ]);

  const somaPorMes = new Map<string, number>();
  for (const pedido of faturadosNoPeriodo) {
    const chave = chaveMesBr(pedido.updatedAt);
    somaPorMes.set(chave, (somaPorMes.get(chave) ?? 0) + Number(pedido.valorTotal));
  }
  const dadosGraficoFaturamento = meses.map((m) => ({
    mes: m.label,
    valor: somaPorMes.get(m.chave) ?? 0,
  }));

  const cartoes = [
    { label: "Pedidos em carteira", valor: String(pedidosEmCarteira) },
    { label: "Pedidos faturados", valor: String(pedidosFaturados) },
    { label: "Clientes ativos", valor: String(clientesAtivos) },
    {
      label: "Valor em carteira",
      valor: formatadorMoeda.format(Number(valorEmCarteira._sum.valorTotal ?? 0)),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Painel" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cartoes.map((cartao) => (
          <Card key={cartao.label}>
            <CardHeader>
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                {cartao.label}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{cartao.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <p className="font-heading text-sm font-semibold">Faturamento (últimos 6 meses)</p>
        </CardHeader>
        <CardContent>
          <GraficoFaturamento dados={dadosGraficoFaturamento} />
        </CardContent>
      </Card>

      <div className="rounded-lg border">
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
                <TableRow key={pedido.id}>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
