import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
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

// PrimeBox opera no horário do Brasil; usamos -03:00 fixo (sem horário de
// verão desde 2019) para os limites do dia, em vez do UTC do servidor.
function limitesDoDiaBr(data: string) {
  const inicio = new Date(`${data}T00:00:00-03:00`);
  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + 1);
  return { inicio, fim };
}

function hojeBr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

type PageProps = {
  searchParams: Promise<{ data?: string }>;
};

export default async function RelatorioFaturamentoPage({ searchParams }: PageProps) {
  const { data } = await searchParams;
  const dataConsultada = data || hojeBr();
  const { inicio, fim } = limitesDoDiaBr(dataConsultada);

  const pedidos = await prisma.pedido.findMany({
    where: {
      status: "FATURADO",
      updatedAt: { gte: inicio, lt: fim },
    },
    include: { cliente: true },
    orderBy: { numero: "asc" },
  });

  const totalDoDia = pedidos.reduce((total, pedido) => total + Number(pedido.valorTotal), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Faturamento por dia" />

      <form action="/relatorios/faturamento" className="flex max-w-xs gap-2">
        <Input type="date" name="data" defaultValue={dataConsultada} />
        <Button type="submit">Buscar</Button>
      </form>

      <div className="rounded-lg border p-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Total faturado no dia
        </p>
        <p className="text-3xl font-semibold tracking-tight">{formatadorMoeda.format(totalDoDia)}</p>
        <p className="text-sm text-muted-foreground">{pedidos.length} pedido(s)</p>
      </div>

      {pedidos.length === 0 ? (
        <p className="text-muted-foreground">Nenhum pedido faturado nessa data.</p>
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
