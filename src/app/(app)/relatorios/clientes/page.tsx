import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { normalizarBusca } from "@/lib/texto";
import { PageHeader } from "@/components/layout/page-header";
import { BuscaClienteInput } from "@/components/relatorios/busca-cliente-input";
import { Badge } from "@/components/ui/badge";
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

  // Busca acento/maiúscula-insensível — feita em JS (normalizarBusca)
  // em vez de `contains` do Prisma, porque o Postgres não ignora
  // acento por padrão (só maiúscula/minúscula com mode:"insensitive").
  // Lista de clientes é pequena o bastante pra filtrar toda em memória,
  // e essa mesma lista também alimenta o autocomplete do campo de busca.
  const todosClientes = await prisma.cliente.findMany({
    select: { id: true, razaoSocial: true, nomeFantasia: true },
    orderBy: { razaoSocial: "asc" },
  });

  const termoBusca = q ? normalizarBusca(q) : "";
  const clientesEncontrados =
    termoBusca && !clienteId
      ? todosClientes
          .filter(
            (cliente) =>
              normalizarBusca(cliente.razaoSocial).includes(termoBusca) ||
              (cliente.nomeFantasia && normalizarBusca(cliente.nomeFantasia).includes(termoBusca)),
          )
          .slice(0, 20)
      : [];

  // Achou exatamente 1 cliente na busca: mostra o relatório direto, sem
  // precisar clicar de novo pra "abrir" o único resultado possível.
  const clienteIdEfetivo = clienteId || (clientesEncontrados.length === 1 ? clientesEncontrados[0].id : undefined);

  if (clienteIdEfetivo) {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteIdEfetivo } });
    if (!cliente) {
      return (
        <div className="flex flex-col gap-6">
          <PageHeader title="Relatório por cliente" />
          <p className="text-muted-foreground">Cliente não encontrado.</p>
        </div>
      );
    }

    const pedidos = await prisma.pedido.findMany({
      where: { clienteId: clienteIdEfetivo },
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
                      <Badge className="bg-positive-soft text-positive">Pago</Badge>
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Relatório por cliente" />

      <form action="/relatorios/clientes">
        <BuscaClienteInput clientes={todosClientes} valorInicial={q ?? ""} />
      </form>

      {q && (
        <div className="rounded-lg border">
          {clientesEncontrados.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhum cliente encontrado com esse nome.
            </p>
          ) : (
            <Table>
              <TableBody>
                {clientesEncontrados.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell>
                      <p className="font-medium">{cliente.nomeFantasia || cliente.razaoSocial}</p>
                      {cliente.nomeFantasia && (
                        <span className="block text-xs text-muted-foreground">
                          {cliente.razaoSocial}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        render={<Link href={`/relatorios/clientes?clienteId=${cliente.id}`} />}
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                      >
                        Ver detalhadamente
                      </Button>
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
