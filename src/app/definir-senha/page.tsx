import { Box } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/convite";
import { DefinirSenhaForm } from "@/components/login/definir-senha-form";

export const dynamic = "force-dynamic";

export default async function DefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const usuario = token
    ? await prisma.usuario.findUnique({ where: { tokenConviteHash: hashToken(token) } })
    : null;

  const linkValido =
    !!usuario &&
    usuario.ativo &&
    !!usuario.tokenConviteExpiraEm &&
    usuario.tokenConviteExpiraEm > new Date();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg">
            <Box className="size-6" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {linkValido ? "Defina sua senha" : "Link inválido"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {linkValido
                ? `Bem-vindo(a) à PrimeBox, ${usuario!.nome}. Escolha a senha da sua conta.`
                : "Esse link de convite não existe mais, já foi usado ou expirou. Peça um novo link."}
            </p>
          </div>
        </div>

        {linkValido && <DefinirSenhaForm token={token!} />}
      </div>
    </div>
  );
}
