import Link from "next/link";
import { Eye, Check, Undo2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { marcarComoPago, marcarComoPendente } from "@/app/cobrancas/actions";
import { statusExibicaoCobranca, statusExibicaoLabels } from "@/lib/cobranca";
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

// Lista cobranças ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatadorData = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

const badgeClasses: Record<string, string> = {
  PAGO: "bg-positive-soft text-positive",
  ATRASADO: "bg-destructive/10 text-destructive",
};

export default async function FaturamentoPage() {
  const cobrancas = await prisma.cobranca.findMany({
    include: { pedido: { include: { cliente: true } } },
    orderBy: { vencimento: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Faturamento" />

      {cobrancas.length === 0 ? (
        <p className="text-muted-foreground">
          Nenhuma cobrança gerada ainda. Gere uma a partir de um pedido faturado.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cobrancas.map((cobranca) => {
                const statusExibicao = statusExibicaoCobranca(cobranca);
                return (
                  <TableRow key={cobranca.id}>
                    <TableCell className="font-mono">#{cobranca.numero}</TableCell>
                    <TableCell className="font-medium">
                      {cobranca.pedido.cliente.nomeFantasia || cobranca.pedido.cliente.razaoSocial}
                    </TableCell>
                    <TableCell>
                      <Link href={`/pedidos/${cobranca.pedido.id}`} className="hover:underline">
                        #{cobranca.pedido.numero}
                      </Link>
                    </TableCell>
                    <TableCell>{formatadorData.format(cobranca.vencimento)}</TableCell>
                    <TableCell className="text-right">
                      {formatadorMoeda.format(Number(cobranca.pedido.valorTotal))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={badgeClasses[statusExibicao] ?? ""}
                        variant="secondary"
                      >
                        {statusExibicaoLabels[statusExibicao]}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <Button
                        render={<Link href={`/cobrancas/${cobranca.id}`} />}
                        nativeButton={false}
                        variant="outline"
                        size="icon-sm"
                        aria-label="Ver recibo"
                        title="Ver recibo"
                      >
                        <Eye />
                      </Button>
                      {statusExibicao === "PAGO" ? (
                        <form
                          action={async () => {
                            "use server";
                            await marcarComoPendente(cobranca.id);
                          }}
                        >
                          <Button
                            type="submit"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Marcar como pendente"
                            title="Marcar como pendente"
                          >
                            <Undo2 />
                          </Button>
                        </form>
                      ) : (
                        <form
                          action={async () => {
                            "use server";
                            await marcarComoPago(cobranca.id);
                          }}
                        >
                          <Button
                            type="submit"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Marcar como pago"
                            title="Marcar como pago"
                          >
                            <Check />
                          </Button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
