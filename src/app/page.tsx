import Link from "next/link";
import { prisma } from "@/lib/prisma";
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

export default async function PainelPage() {
  const [
    clientesAtivos,
    pedidosEmCarteira,
    pedidosFaturados,
    valorEmCarteira,
    pedidosRecentes,
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
  ]);

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
