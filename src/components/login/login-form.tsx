"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampoObrigatorio } from "@/components/ui/campo-obrigatorio";

function BotaoEntrar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full" data-cy="login-submit">
      {pending ? "Entrando..." : "Entrar"}
    </Button>
  );
}

export function LoginForm() {
  const [estado, acao] = useActionState(login, undefined);

  return (
    <form action={acao} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">
          E-mail
          <CampoObrigatorio />
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="seu@email.com"
          required
          data-cy="login-email"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="senha">
          Senha
          <CampoObrigatorio />
        </Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          data-cy="login-password"
        />
      </div>

      {estado && !estado.success && (
        <p className="text-sm text-destructive" data-cy="login-error-message">
          {estado.error}
        </p>
      )}

      <BotaoEntrar />
    </form>
  );
}
