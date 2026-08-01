import Link from "next/link";
import { Eye, Pencil, Check, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { excluirPedido, faturarPedido } from "./actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StatusPedido } from "@/generated/prisma/enums";

// Lista pedidos ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatadorData = new Intl.DateTimeFormat("pt-BR");

const abas: { label: string; status?: StatusPedido }[] = [
  { label: "Todos" },
  { label: "Em carteira", status: "EM_CARTEIRA" },
  { label: "Faturados", status: "FATURADO" },
];

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function PedidosPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const statusValido: StatusPedido | undefined =
    status === "EM_CARTEIRA" || status === "FATURADO" ? status : undefined;

  const pedidos = await prisma.pedido.findMany({
    where: statusValido ? { status: statusValido } : undefined,
    include: { cliente: true, itens: { include: { ordemProducao: true } } },
    orderBy: { numero: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pedidos"
        action={
          <Button render={<Link href="/pedidos/novo" />} nativeButton={false}>
            Novo pedido
          </Button>
        }
      />

      <div className="flex gap-1 self-start rounded-lg bg-muted p-1">
        {abas.map((aba) => {
          const ativa = aba.status === statusValido;
          const href = aba.status ? `/pedidos?status=${aba.status}` : "/pedidos";
          return (
            <Button
              key={aba.label}
              render={<Link href={href} />}
              nativeButton={false}
              variant={ativa ? "default" : "ghost"}
              size="sm"
            >
              {aba.label}
            </Button>
          );
        })}
      </div>

      {pedidos.length === 0 ? (
        <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-mono">#{pedido.numero}</TableCell>
                  <TableCell className="font-medium">
                    {pedido.cliente.nomeFantasia || pedido.cliente.razaoSocial}
                  </TableCell>
                  <TableCell>{formatadorData.format(pedido.createdAt)}</TableCell>
                  <TableCell>{formatadorMoeda.format(Number(pedido.valorTotal))}</TableCell>
                  <TableCell>
                    {pedido.status === "FATURADO" ? (
                      <Badge className="bg-positive-soft text-positive">Faturado</Badge>
                    ) : (
                      <Badge variant="secondary">Em carteira</Badge>
                    )}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button
                      render={<Link href={`/pedidos/${pedido.id}`} />}
                      nativeButton={false}
                      variant="outline"
                      size="icon-sm"
                      aria-label="Ver/imprimir pedido"
                      title="Ver/imprimir"
                    >
                      <Eye />
                    </Button>
                    {pedido.status === "EM_CARTEIRA" && (
                      <>
                        {!pedido.itens.some((item) => item.ordemProducao) && (
                          <>
                            <Button
                              render={<Link href={`/pedidos/${pedido.id}/editar`} />}
                              nativeButton={false}
                              variant="outline"
                              size="icon-sm"
                              aria-label="Editar pedido"
                              title="Editar"
                            >
                              <Pencil />
                            </Button>
                            <form
                              action={async () => {
                                "use server";
                                await excluirPedido(pedido.id);
                              }}
                            >
                              <Button
                                type="submit"
                                variant="outline"
                                size="icon-sm"
                                aria-label="Excluir pedido"
                                title="Excluir"
                              >
                                <Trash2 />
                              </Button>
                            </form>
                          </>
                        )}
                        <form
                          action={async () => {
                            "use server";
                            await faturarPedido(pedido.id);
                          }}
                        >
                          <Button
                            type="submit"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Faturar pedido"
                            title="Faturar"
                          >
                            <Check />
                          </Button>
                        </form>
                      </>
                    )}
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
