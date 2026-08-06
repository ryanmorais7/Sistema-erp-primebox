import { Box } from "lucide-react";
import { LoginForm } from "@/components/login/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="relative flex flex-col justify-between overflow-hidden bg-sidebar px-8 py-10 text-sidebar-foreground md:w-[42%] md:px-12 md:py-14">
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, var(--brand), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, var(--brand), transparent 70%)" }}
        />

        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg">
            <Box className="size-6" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-heading text-xl font-semibold">PrimeBox</span>
            <span className="font-mono text-[0.65rem] tracking-wider text-sidebar-foreground/60 uppercase">
              Sistema de gestão
            </span>
          </div>
        </div>

        <div className="relative hidden md:block">
          <p className="font-heading text-3xl leading-snug font-semibold text-balance">
            Pedido, produção e estoque num só lugar.
          </p>
          <p className="mt-3 max-w-xs text-sm text-sidebar-foreground/60">
            Acesso restrito à equipe da PrimeBox.
          </p>
        </div>

        <p className="relative font-mono text-[0.65rem] text-sidebar-foreground/40">
          v0.1 · uso interno
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Entrar</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use o e-mail e a senha da sua conta PrimeBox.
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
