import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { limitesDoPeriodoBr, hojeBr } from "@/lib/data";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
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

type LinhaFaturamento = {
  id: string;
  origem: "formal" | "avulsa";
  numeroLabel: string;
  href: string | null;
  clienteLabel: string;
  valor: number;
  data: Date;
};

export default async function RelatorioFaturamentoPage({ searchParams }: PageProps) {
  const { inicio: inicioParam, fim: fimParam } = await searchParams;
  const hoje = hojeBr();
  const dataInicio = inicioParam || hoje;
  const dataFim = fimParam || hoje;
  const { inicio, fim } = limitesDoPeriodoBr(dataInicio, dataFim);

  const [pedidos, itensAvulsos] = await Promise.all([
    prisma.pedido.findMany({
      where: {
        status: "FATURADO",
        faturadoEm: { gte: inicio, lt: fim },
      },
      include: { cliente: true },
      orderBy: { numero: "asc" },
    }),
    // OP avulsa concluída também entra no faturamento — a data que conta
    // é quando ela virou CONCLUIDO (updatedAt). Diferente do lado
    // formal (que agora usa faturadoEm, fixo — ver ADR-009 atualizado),
    // o avulso não tem um campo próprio ainda; editar um item avulso já
    // concluído pode deslocar essa data — risco pré-existente, fora do
    // escopo desta correção. Preço em branco conta como 0.
    prisma.itemOrdemAvulsa.findMany({
      where: {
        status: "CONCLUIDO",
        updatedAt: { gte: inicio, lt: fim },
      },
      include: { ordemAvulsa: true },
      orderBy: { updatedAt: "asc" },
    }),
  ]);

  const linhasFormais: LinhaFaturamento[] = pedidos.map((pedido) => ({
    id: pedido.id,
    origem: "formal",
    numeroLabel: `#${pedido.numero}`,
    href: `/pedidos/${pedido.id}`,
    clienteLabel: pedido.cliente.nomeFantasia || pedido.cliente.razaoSocial,
    valor: Number(pedido.valorTotal),
    data: pedido.faturadoEm!,
  }));

  const linhasAvulsas: LinhaFaturamento[] = itensAvulsos.map((item) => ({
    id: item.id,
    origem: "avulsa",
    numeroLabel: `OP #${item.ordemAvulsa.numero}`,
    href: null,
    clienteLabel: item.clienteTexto,
    valor: item.precoUnitario ? Number(item.precoUnitario) * item.quantidade : 0,
    data: item.updatedAt,
  }));

  const linhasFaturamento = [...linhasFormais, ...linhasAvulsas].sort(
    (a, b) => a.data.getTime() - b.data.getTime(),
  );

  const totalDoPeriodo = linhasFaturamento.reduce((total, linha) => total + linha.valor, 0);

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
        <p className="text-sm text-muted-foreground">
          {linhasFaturamento.length} registro(s)
          {linhasAvulsas.length > 0 && ` · ${linhasAvulsas.length} avulso(s)`}
        </p>
      </div>

      {linhasFaturamento.length === 0 ? (
        <p className="text-muted-foreground">Nenhum faturamento nesse período.</p>
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
              {linhasFaturamento.map((linha) => (
                <TableRow key={`${linha.origem}-${linha.id}`}>
                  <TableCell className="font-mono">
                    {linha.href ? (
                      <Link href={linha.href} className="hover:underline">
                        {linha.numeroLabel}
                      </Link>
                    ) : (
                      linha.numeroLabel
                    )}
                    {linha.origem === "avulsa" && (
                      <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[0.6rem]">
                        avulsa
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{linha.clienteLabel}</TableCell>
                  <TableCell className="text-right">{formatadorMoeda.format(linha.valor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
