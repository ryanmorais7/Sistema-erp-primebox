"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarRectangleItem,
} from "recharts";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

type DadoMes = {
  chave: string;
  label: string;
  labelCompleto: string;
  pedidosEmCarteira: number;
  valorEmCarteira: number;
  pedidosFaturados: number;
  faturamento: number;
  clientesAtivos: number;
};

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const formatadorMoedaCompleto = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function PainelInterativo({ dadosPorMes }: { dadosPorMes: DadoMes[] }) {
  const [chaveSelecionada, setChaveSelecionada] = useState(
    dadosPorMes[dadosPorMes.length - 1]?.chave,
  );

  const indiceSelecionado = dadosPorMes.findIndex((m) => m.chave === chaveSelecionada);
  const dadoSelecionado = dadosPorMes[indiceSelecionado] ?? dadosPorMes[dadosPorMes.length - 1];
  const dadoMesAnterior = indiceSelecionado > 0 ? dadosPorMes[indiceSelecionado - 1] : null;

  const variacao =
    dadoMesAnterior && dadoMesAnterior.faturamento > 0
      ? ((dadoSelecionado.faturamento - dadoMesAnterior.faturamento) / dadoMesAnterior.faturamento) * 100
      : null;

  const cartoes = [
    {
      label: "Pedidos em carteira",
      valor: String(dadoSelecionado.pedidosEmCarteira),
      href: "/pedidos?status=EM_CARTEIRA",
    },
    {
      label: "Pedidos faturados",
      valor: String(dadoSelecionado.pedidosFaturados),
      href: "/pedidos?status=FATURADO",
    },
    { label: "Clientes ativos", valor: String(dadoSelecionado.clientesAtivos), href: "/clientes" },
    {
      label: "Valor em carteira",
      valor: formatadorMoedaCompleto.format(dadoSelecionado.valorEmCarteira),
      href: "/pedidos?status=EM_CARTEIRA",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-xs text-muted-foreground">
          Mostrando dados de{" "}
          <strong className="text-foreground">{dadoSelecionado.labelCompleto}</strong>. Clique em
          outro mês no gráfico abaixo para comparar.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cartoes.map((cartao) => (
            <Link key={cartao.label} href={cartao.href}>
              <Card className="transition-colors hover:bg-accent/40">
                <CardHeader>
                  <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    {cartao.label}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tracking-tight">{cartao.valor}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <p className="font-heading text-sm font-semibold">Faturamento (últimos 6 meses)</p>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosPorMes}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                barCategoryGap="24%"
              >
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  tickFormatter={(valor: number) => formatadorMoeda.format(valor)}
                  width={72}
                />
                <Tooltip
                  cursor={{ fill: "var(--accent)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
                  formatter={(valor) => [formatadorMoedaCompleto.format(Number(valor)), "Faturado"]}
                />
                <Bar
                  dataKey="faturamento"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                  minPointSize={3}
                  onClick={(dado: BarRectangleItem) => {
                    const chave = (dado.payload as DadoMes | undefined)?.chave;
                    if (chave) setChaveSelecionada(chave);
                  }}
                  cursor="pointer"
                >
                  {dadosPorMes.map((m) => (
                    <Cell
                      key={m.chave}
                      fill="var(--brand)"
                      fillOpacity={m.chave === chaveSelecionada ? 1 : 0.35}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="font-heading text-sm font-semibold">
            Faturamento em {dadoSelecionado.labelCompleto}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold tracking-tight">
                {formatadorMoedaCompleto.format(dadoSelecionado.faturamento)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {dadoSelecionado.pedidosFaturados}{" "}
                {dadoSelecionado.pedidosFaturados === 1 ? "pedido faturado" : "pedidos faturados"}
              </p>
            </div>
            {variacao !== null && (
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  variacao >= 0 ? "text-positive" : "text-destructive"
                }`}
              >
                {variacao >= 0 ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
                {Math.abs(variacao).toFixed(1)}% vs {dadoMesAnterior?.label}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
