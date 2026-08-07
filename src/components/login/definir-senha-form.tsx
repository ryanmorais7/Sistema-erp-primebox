"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { definirSenha } from "@/app/login/actions";
import { definirSenhaSchema, type DefinirSenhaFormValues } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const valoresPadrao: DefinirSenhaFormValues = {
  novaSenha: "",
  confirmarSenha: "",
};

export function DefinirSenhaForm({ token }: { token: string }) {
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DefinirSenhaFormValues>({
    resolver: zodResolver(definirSenhaSchema),
    defaultValues: valoresPadrao,
  });

  async function aoSubmeter(dados: DefinirSenhaFormValues) {
    setErroGeral(null);
    const resultado = await definirSenha(token, dados);

    if (resultado && !resultado.success) {
      setErroGeral(resultado.error);
      for (const [campo, mensagem] of Object.entries(resultado.camposComErro ?? {})) {
        setError(campo as keyof DefinirSenhaFormValues, { message: mensagem });
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="novaSenha">Senha</Label>
        <Input id="novaSenha" type="password" autoComplete="new-password" {...register("novaSenha")} />
        {errors.novaSenha && <p className="text-sm text-destructive">{errors.novaSenha.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmarSenha">Confirmar senha</Label>
        <Input
          id="confirmarSenha"
          type="password"
          autoComplete="new-password"
          {...register("confirmarSenha")}
        />
        {errors.confirmarSenha && (
          <p className="text-sm text-destructive">{errors.confirmarSenha.message}</p>
        )}
      </div>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Salvando..." : "Salvar e entrar"}
      </Button>
    </form>
  );
}
