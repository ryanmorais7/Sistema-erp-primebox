import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { criarCobranca } from "@/app/(app)/cobrancas/actions";
import { hojeBr } from "@/lib/data";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function NovaCobrancaPage({ params }: PageProps) {
  const { id } = await params;

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { cliente: true, cobranca: true },
  });

  if (!pedido) {
    notFound();
  }

  if (pedido.status !== "FATURADO" || pedido.cobranca) {
    redirect(`/pedidos/${pedido.id}`);
  }

  async function aoSubmeter(formData: FormData) {
    "use server";
    const vencimento = String(formData.get("vencimento") ?? "");
    const cobranca = await criarCobranca(id, vencimento);
    if (cobranca) {
      redirect(`/cobrancas/${cobranca.id}`);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Nova cobrança · Pedido #${pedido.numero}`} />
      <form action={aoSubmeter} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados da cobrança</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Cliente: {pedido.cliente.nomeFantasia || pedido.cliente.razaoSocial}
            </p>
            <div className="flex flex-col gap-2 sm:max-w-xs">
              <Label htmlFor="vencimento">Vencimento *</Label>
              <Input
                id="vencimento"
                type="date"
                name="vencimento"
                defaultValue={hojeBr()}
                required
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            render={<Link href={`/pedidos/${pedido.id}`} />}
            nativeButton={false}
            variant="outline"
          >
            Cancelar
          </Button>
          <Button type="submit">Gerar cobrança</Button>
        </div>
      </form>
    </div>
  );
}
