import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { marcarComoPago, marcarComoPendente } from "@/app/(app)/cobrancas/actions";
import { statusExibicaoCobranca, statusExibicaoLabels } from "@/lib/cobranca";
import { ImprimirButton } from "@/components/pedidos/imprimir-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatadorData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" });

function formatarDocumento(cnpj: string | null, cpf: string | null) {
  if (cnpj) return `CNPJ ${cnpj}`;
  if (cpf) return `CPF ${cpf}`;
  return null;
}

const badgeClasses: Record<string, string> = {
  PAGO: "bg-positive-soft text-positive",
  ATRASADO: "bg-destructive/10 text-destructive",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReciboPage({ params }: PageProps) {
  const { id } = await params;

  const cobranca = await prisma.cobranca.findUnique({
    where: { id },
    include: { pedido: { include: { cliente: true } } },
  });

  if (!cobranca) {
    notFound();
  }

  const statusExibicao = statusExibicaoCobranca(cobranca);
  const documento = formatarDocumento(cobranca.pedido.cliente.cnpj, cobranca.pedido.cliente.cpf);

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      <div className="flex items-start justify-between print:hidden">
        <div>
          <p className="font-mono text-[0.7rem] tracking-widest text-brand uppercase">
            PrimeBox ERP
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Recibo #{cobranca.numero}</h1>
        </div>
        <div className="flex items-center gap-2">
          {statusExibicao === "PAGO" ? (
            <form
              action={async () => {
                "use server";
                await marcarComoPendente(cobranca.id);
              }}
            >
              <Button type="submit" variant="outline">
                Marcar como pendente
              </Button>
            </form>
          ) : (
            <form
              action={async () => {
                "use server";
                await marcarComoPago(cobranca.id);
              }}
            >
              <Button type="submit" variant="outline">
                Marcar como pago
              </Button>
            </form>
          )}
          <ImprimirButton />
        </div>
      </div>

      <div className="rounded-lg border p-6 print:border-none print:p-0">
        <div className="flex items-start justify-between border-b pb-4 print:pb-2">
          <div>
            <p className="font-heading text-lg font-semibold">PrimeBox</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm">Recibo #{cobranca.numero}</p>
            <p className="text-sm text-muted-foreground">
              Ref.:{" "}
              <Link href={`/pedidos/${cobranca.pedido.id}`} className="hover:underline">
                Pedido #{cobranca.pedido.numero}
              </Link>
            </p>
            <Badge className={`mt-1 ${badgeClasses[statusExibicao] ?? ""}`} variant="secondary">
              {statusExibicaoLabels[statusExibicao]}
            </Badge>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Cliente
          </p>
          <p className="font-medium">
            {cobranca.pedido.cliente.nomeFantasia || cobranca.pedido.cliente.razaoSocial}
          </p>
          <p className="text-sm text-muted-foreground">
            {[documento, cobranca.pedido.cliente.telefone].filter(Boolean).join(" · ")}
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Vencimento
            </p>
            <p className="font-medium">{formatadorData.format(cobranca.vencimento)}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Valor
            </p>
            <p className="text-lg font-semibold">
              {formatadorMoeda.format(Number(cobranca.pedido.valorTotal))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
