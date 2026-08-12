import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { gerarExpedicao } from "@/app/(app)/expedicao/actions";
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

export default async function NovaExpedicaoPage({ params }: PageProps) {
  const { id } = await params;

  const [pedido, expedicoesAnteriores] = await Promise.all([
    prisma.pedido.findUnique({
      where: { id },
      include: { cliente: true, expedicao: true },
    }),
    prisma.expedicao.findMany({
      where: { transportadora: { not: null } },
      distinct: ["transportadora"],
      select: { transportadora: true },
    }),
  ]);

  if (!pedido) {
    notFound();
  }

  const transportadorasSugeridas = [
    "Veículo da empresa",
    ...expedicoesAnteriores
      .map((e) => e.transportadora)
      .filter((nome): nome is string => Boolean(nome) && nome !== "Veículo da empresa"),
  ];

  if (pedido.expedicao) {
    redirect(`/pedidos/${pedido.id}`);
  }

  async function aoSubmeter(formData: FormData) {
    "use server";
    const transportadora = String(formData.get("transportadora") ?? "");
    await gerarExpedicao(id, transportadora);
    redirect(`/pedidos/${id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Nova expedição · Pedido #${pedido.numero}`} />
      <form action={aoSubmeter} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados da expedição</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Cliente: {pedido.cliente.nomeFantasia || pedido.cliente.razaoSocial}
              {pedido.cliente.cidade && ` · ${pedido.cliente.cidade}/${pedido.cliente.estado ?? ""}`}
            </p>
            <div className="flex flex-col gap-2 sm:max-w-xs">
              <Label htmlFor="transportadora">Transportadora</Label>
              <Input
                id="transportadora"
                name="transportadora"
                list="transportadoras-sugeridas"
                placeholder="Ex: Rota Norte Transportes, ou Veículo da empresa (opcional)"
              />
              <datalist id="transportadoras-sugeridas">
                {transportadorasSugeridas.map((nome) => (
                  <option key={nome} value={nome} />
                ))}
              </datalist>
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
          <Button type="submit">Gerar expedição</Button>
        </div>
      </form>
    </div>
  );
}
