import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { iniciarProducao, concluirProducao } from "./actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Lista ordens de produção ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const colunas = [
  { status: "AGUARDANDO", titulo: "Aguardando" },
  { status: "EM_PRODUCAO", titulo: "Em produção" },
  { status: "CONCLUIDO", titulo: "Concluído" },
] as const;

export default async function ProducaoPage() {
  const ordens = await prisma.ordemProducao.findMany({
    include: { itemPedido: { include: { produto: true, pedido: { include: { cliente: true } } } } },
    orderBy: { numero: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Produção" />

      <div className="grid gap-4 lg:grid-cols-3">
        {colunas.map((coluna) => {
          const ordensDaColuna = ordens.filter((ordem) => ordem.status === coluna.status);
          return (
            <div key={coluna.status} className="rounded-lg border">
              <div className="flex items-center justify-between border-b p-3">
                <p className="font-heading text-sm font-semibold">{coluna.titulo}</p>
                <Badge variant="secondary">{ordensDaColuna.length}</Badge>
              </div>
              <div className="flex flex-col gap-3 p-3">
                {ordensDaColuna.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma ordem aqui.</p>
                ) : (
                  ordensDaColuna.map((ordem) => (
                    <div key={ordem.id} className="rounded-lg border p-3">
                      <p className="font-mono text-xs text-muted-foreground">OP #{ordem.numero}</p>
                      <Link
                        href={`/pedidos/${ordem.itemPedido.pedido.id}`}
                        className="font-medium hover:underline"
                      >
                        {ordem.itemPedido.pedido.cliente.nomeFantasia ||
                          ordem.itemPedido.pedido.cliente.razaoSocial}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {ordem.itemPedido.quantidade}x {ordem.itemPedido.produto.nome}
                      </p>

                      {coluna.status === "AGUARDANDO" && (
                        <form
                          action={async () => {
                            "use server";
                            await iniciarProducao(ordem.id);
                          }}
                          className="mt-3"
                        >
                          <Button type="submit" variant="outline" size="sm">
                            Iniciar produção
                            <ArrowRight />
                          </Button>
                        </form>
                      )}

                      {coluna.status === "EM_PRODUCAO" && (
                        <form
                          action={async () => {
                            "use server";
                            await concluirProducao(ordem.id);
                          }}
                          className="mt-3"
                        >
                          <Button type="submit" variant="outline" size="sm">
                            Concluir
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
