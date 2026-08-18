import Link from "next/link";
import { Eye, Check, Trash2, Printer, Upload, AlertCircle, CircleCheck, CircleDashed } from "lucide-react";
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

function BadgeProducao({ geradas, total }: { geradas: number; total: number }) {
  if (total === 0) return <span className="text-muted-foreground">—</span>;

  if (geradas === 0) {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#F4E2D6] px-2 py-0.5 text-xs font-medium">
        <AlertCircle className="size-3.5 text-[#C9622B]" />
        <span className="text-[#C9622B]">{geradas}</span>
        <span className="text-[#B08968]">/{total} OP</span>
      </span>
    );
  }

  if (geradas === total) {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#DFEAE6] px-2 py-0.5 text-xs font-medium">
        <CircleCheck className="size-3.5 text-[#0F6E56]" />
        <span className="text-[#0F6E56]">{geradas}</span>
        <span className="text-[#5B9080]">/{total} OP</span>
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#F4E2D6] px-2 py-0.5 text-xs font-medium">
      <CircleDashed className="size-3.5 text-[#0F6E56]" />
      <span className="text-[#0F6E56]">{geradas}</span>
      <span className="text-[#B08968]">/{total} OP</span>
    </span>
  );
}

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
          <div className="flex gap-2">
            <Button render={<Link href="/pedidos/importar" />} nativeButton={false} variant="outline">
              <Upload />
              Importar planilha
            </Button>
            <Button render={<Link href="/pedidos/novo" />} nativeButton={false}>
              Novo pedido
            </Button>
          </div>
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
                <TableHead>Produção</TableHead>
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
                  <TableCell>
                    <BadgeProducao
                      geradas={
                        pedido.itens.filter((item) => item.ordemProducao || item.atendidoEstoque)
                          .length
                      }
                      total={pedido.itens.length}
                    />
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button
                      render={<Link href={`/pedidos/${pedido.id}`} />}
                      nativeButton={false}
                      variant="outline"
                      size="sm"
                    >
                      <Eye />
                      Ver pedido
                    </Button>
                    <Button
                      render={<Link href={`/pedidos/${pedido.id}?print=1`} target="_blank" />}
                      nativeButton={false}
                      variant="outline"
                      size="icon-sm"
                      aria-label="Imprimir pedido"
                      title="Imprimir"
                    >
                      <Printer />
                    </Button>
                    {/* Editar fica disponível em qualquer status (Em carteira ou
                        Faturado) — só trava se algum item já tem OP, porque
                        editar recriaria os itens do zero e apagaria a OP em
                        cascata (ver ADR-006/ADR-010, atualizado). */}
                    {!pedido.itens.some((item) => item.ordemProducao) && (
                      <Button
                        render={<Link href={`/pedidos/${pedido.id}/editar`} />}
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                      >
                        Editar
                      </Button>
                    )}
                    {/* Excluir também fica disponível em qualquer status
                        agora (pedido do Ryan) — mesma trava de Editar,
                        só some se algum item já tem OP. */}
                    {!pedido.itens.some((item) => item.ordemProducao) && (
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
                    )}
                    {pedido.status === "EM_CARTEIRA" && (
                      <form
                        action={async () => {
                          "use server";
                          await faturarPedido(pedido.id);
                        }}
                      >
                        <Button
                          type="submit"
                          size="sm"
                          className="bg-[#C9622B] text-white hover:bg-[#C9622B]/90"
                        >
                          <Check />
                          Faturar
                        </Button>
                      </form>
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
