import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { iniciarRota, marcarEntregue } from "./actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Lista expedições ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const colunas = [
  { status: "AGUARDANDO", titulo: "Aguardando" },
  { status: "EM_ROTA", titulo: "Em rota" },
  { status: "ENTREGUE", titulo: "Entregue" },
] as const;

export default async function ExpedicaoPage() {
  const expedicoes = await prisma.expedicao.findMany({
    include: { pedido: { include: { cliente: true } } },
    orderBy: { numero: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Expedição" />

      <div className="grid gap-4 lg:grid-cols-3">
        {colunas.map((coluna) => {
          const expedicoesDaColuna = expedicoes.filter((exp) => exp.status === coluna.status);
          return (
            <div key={coluna.status} className="rounded-lg border">
              <div className="flex items-center justify-between border-b p-3">
                <p className="font-heading text-sm font-semibold">{coluna.titulo}</p>
                <Badge variant="secondary">{expedicoesDaColuna.length}</Badge>
              </div>
              <div className="flex flex-col gap-3 p-3">
                {expedicoesDaColuna.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma expedição aqui.</p>
                ) : (
                  expedicoesDaColuna.map((expedicao) => (
                    <div key={expedicao.id} className="rounded-lg border p-3">
                      <p className="font-mono text-xs text-muted-foreground">
                        Exp. #{expedicao.numero}
                      </p>
                      <Link
                        href={`/pedidos/${expedicao.pedido.id}`}
                        className="font-medium hover:underline"
                      >
                        {expedicao.pedido.cliente.nomeFantasia ||
                          expedicao.pedido.cliente.razaoSocial}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        Pedido #{expedicao.pedido.numero}
                        {expedicao.pedido.cliente.cidade &&
                          ` · ${expedicao.pedido.cliente.cidade}/${expedicao.pedido.cliente.estado ?? ""}`}
                      </p>
                      {expedicao.transportadora && (
                        <p className="text-sm text-muted-foreground">
                          {expedicao.transportadora}
                        </p>
                      )}

                      {coluna.status === "AGUARDANDO" && (
                        <form
                          action={async () => {
                            "use server";
                            await iniciarRota(expedicao.id);
                          }}
                          className="mt-3"
                        >
                          <Button type="submit" variant="outline" size="sm">
                            Iniciar rota
                            <ArrowRight />
                          </Button>
                        </form>
                      )}

                      {coluna.status === "EM_ROTA" && (
                        <form
                          action={async () => {
                            "use server";
                            await marcarEntregue(expedicao.id);
                          }}
                          className="mt-3"
                        >
                          <Button type="submit" variant="outline" size="sm">
                            Marcar entregue
                            <ArrowRight />
                          </Button>
                        </form>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
