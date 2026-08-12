import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { limitesDoPeriodoBr, hojeBr } from "@/lib/data";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Consulta dados ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type PageProps = {
  searchParams: Promise<{ inicio?: string; fim?: string }>;
};

export default async function RelatorioFaturamentoPage({ searchParams }: PageProps) {
  const { inicio: inicioParam, fim: fimParam } = await searchParams;
  const hoje = hojeBr();
  const dataInicio = inicioParam || hoje;
  const dataFim = fimParam || hoje;
  const { inicio, fim } = limitesDoPeriodoBr(dataInicio, dataFim);

  const pedidos = await prisma.pedido.findMany({
    where: {
      status: "FATURADO",
      updatedAt: { gte: inicio, lt: fim },
    },
    include: { cliente: true },
    orderBy: { numero: "asc" },
  });

  const totalDoPeriodo = pedidos.reduce((total, pedido) => total + Number(pedido.valorTotal), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Faturamento por período" />

      <form action="/relatorios/faturamento" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="inicio">De</Label>
          <Input id="inicio" type="date" name="inicio" defaultValue={dataInicio} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="fim">Até</Label>
          <Input id="fim" type="date" name="fim" defaultValue={dataFim} />
        </div>
        <Button type="submit">Buscar</Button>
      </form>

      <div className="rounded-lg border p-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Total faturado no período
        </p>
        <p className="text-3xl font-semibold tracking-tight">
          {formatadorMoeda.format(totalDoPeriodo)}
        </p>
        <p className="text-sm text-muted-foreground">{pedidos.length} pedido(s)</p>
      </div>

      {pedidos.length === 0 ? (
        <p className="text-muted-foreground">Nenhum pedido faturado nesse período.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-mono">
                    <Link href={`/pedidos/${pedido.id}`} className="hover:underline">
                      #{pedido.numero}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    {pedido.cliente.nomeFantasia || pedido.cliente.razaoSocial}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatadorMoeda.format(Number(pedido.valorTotal))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
