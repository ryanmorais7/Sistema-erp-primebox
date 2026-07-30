import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Números ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

export default async function PainelPage() {
  const [clientesAtivos, produtosAtivos] = await Promise.all([
    prisma.cliente.count({ where: { ativo: true } }),
    prisma.produto.count({ where: { ativo: true } }),
  ]);

  const cartoes = [
    { label: "Clientes ativos", valor: clientesAtivos },
    { label: "Produtos ativos", valor: produtosAtivos },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Painel" />

      <div className="grid gap-4 sm:grid-cols-2">
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
    </div>
  );
}
