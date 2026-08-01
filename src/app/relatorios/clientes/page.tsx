import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
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
const formatadorData = new Intl.DateTimeFormat("pt-BR");
const NOMES_MES = [
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

type PageProps = {
  searchParams: Promise<{ q?: string; clienteId?: string }>;
};

function agruparPorMes(pedidos: { createdAt: Date; valorTotal: number }[]) {
  const mapa = new Map<string, { ano: number; mes: number; total: number; quantidade: number }>();
  for (const pedido of pedidos) {
    const ano = pedido.createdAt.getFullYear();
    const mes = pedido.createdAt.getMonth() + 1;
    const chave = `${ano}-${mes}`;
    const atual = mapa.get(chave) ?? { ano, mes, total: 0, quantidade: 0 };
    atual.total += pedido.valorTotal;
    atual.quantidade += 1;
    mapa.set(chave, atual);
  }
  return Array.from(mapa.values()).sort((a, b) => b.ano - a.ano || b.mes - a.mes);
}

function agruparPorAno(pedidos: { createdAt: Date; valorTotal: number }[]) {
  const mapa = new Map<number, { ano: number; total: number; quantidade: number }>();
  for (const pedido of pedidos) {
    const ano = pedido.createdAt.getFullYear();
    const atual = mapa.get(ano) ?? { ano, total: 0, quantidade: 0 };
    atual.total += pedido.valorTotal;
    atual.quantidade += 1;
    mapa.set(ano, atual);
  }
  return Array.from(mapa.values()).sort((a, b) => b.ano - a.ano);
}

export default async function RelatorioClientesPage({ searchParams }: PageProps) {
  const { q, clienteId } = await searchParams;

  if (clienteId) {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) {
      return (
        <div className="flex flex-col gap-6">
          <PageHeader title="Relatório por cliente" />
          <p className="text-muted-foreground">Cliente não encontrado.</p>
        </div>
      );
    }

    const pedidos = await prisma.pedido.findMany({
      where: { clienteId },
      orderBy: { numero: "desc" },
    });
    const pedidosNumero = pedidos.map((pedido) => ({
      ...pedido,
      valorTotal: Number(pedido.valorTotal),
    }));
    const totalGeral = pedidosNumero.reduce((total, pedido) => total + pedido.valorTotal, 0);
    const porAno = agruparPorAno(pedidosNumero);
    const porMes = agruparPorMes(pedidosNumero);

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Relatório por cliente"
          action={
            <Button render={<Link href="/relatorios/clientes" />} nativeButton={false} variant="outline">
              Nova busca
            </Button>
          }
        />

        <div className="rounded-lg border p-4">
          <p className="font-medium">{cliente.nomeFantasia || cliente.razaoSocial}</p>
          {cliente.nomeFantasia && (
            <p className="text-sm text-muted-foreground">{cliente.razaoSocial}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {pedidosNumero.length} pedido(s) · Total comprado:{" "}
            <span className="font-medium text-foreground">
              {formatadorMoeda.format(totalGeral)}
            </span>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border">
            <p className="border-b p-3 font-heading text-sm font-semibold">Total por ano</p>
            <Table>
              <TableBody>
                {porAno.map((grupo) => (
                  <TableRow key={grupo.ano}>
                    <TableCell>{grupo.ano}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {grupo.quantidade} pedido(s)
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatadorMoeda.format(grupo.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-lg border">
            <p className="border-b p-3 font-heading text-sm font-semibold">Total por mês</p>
            <Table>
              <TableBody>
                {porMes.map((grupo) => (
                  <TableRow key={`${grupo.ano}-${grupo.mes}`}>
                    <TableCell>
                      {NOMES_MES[grupo.mes - 1]}/{grupo.ano}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {grupo.quantidade} pedido(s)
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatadorMoeda.format(grupo.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="rounded-lg border">
          <p className="border-b p-3 font-heading text-sm font-semibold">Todos os pedidos</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosNumero.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-mono">
                    <Link href={`/pedidos/${pedido.id}`} className="hover:underline">
                      #{pedido.numero}
                    </Link>
                  </TableCell>
                  <TableCell>{formatadorData.format(pedido.createdAt)}</TableCell>
                  <TableCell>{formatadorMoeda.format(pedido.valorTotal)}</TableCell>
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
        </div>
      </div>
    );
  }

  const clientesEncontrados = q
    ? await prisma.cliente.findMany({
        where: {
          OR: [
            { razaoSocial: { contains: q, mode: "insensitive" } },
            { nomeFantasia: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { razaoSocial: "asc" },
        take: 20,
      })
    : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Relatório por cliente" />

      <form action="/relatorios/clientes" className="flex max-w-md gap-2">
        <Input name="q" defaultValue={q} placeholder="Buscar por nome do cliente" />
        <Button type="submit">Buscar</Button>
      </form>

      {q && (
        <div className="rounded-lg border">
          {clientesEncontrados.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhum cliente encontrado para &quot;{q}&quot;.
            </p>
          ) : (
            <Table>
              <TableBody>
                {clientesEncontrados.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell>
                      <Link
                        href={`/relatorios/clientes?clienteId=${cliente.id}`}
                        className="font-medium hover:underline"
                      >
                        {cliente.nomeFantasia || cliente.razaoSocial}
                      </Link>
                      {cliente.nomeFantasia && (
                        <span className="block text-xs text-muted-foreground">
                          {cliente.razaoSocial}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
