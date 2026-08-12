"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { trocarSenha } from "@/app/login/actions";
import { trocarSenhaSchema, type TrocarSenhaFormValues } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampoObrigatorio } from "@/components/ui/campo-obrigatorio";

const valoresPadrao: TrocarSenhaFormValues = {
  senhaAtual: "",
  novaSenha: "",
  confirmarSenha: "",
};

export function TrocarSenhaForm() {
  const router = useRouter();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrocarSenhaFormValues>({
    resolver: zodResolver(trocarSenhaSchema),
    defaultValues: valoresPadrao,
  });

  async function aoSubmeter(dados: TrocarSenhaFormValues) {
    setErroGeral(null);
    setSucesso(false);
    const resultado = await trocarSenha(dados);

    if (!resultado.success) {
      setErroGeral(resultado.error);
      for (const [campo, mensagem] of Object.entries(resultado.camposComErro ?? {})) {
        setError(campo as keyof TrocarSenhaFormValues, { message: mensagem });
      }
      return;
    }

    setSucesso(true);
    reset(valoresPadrao);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Trocar senha</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="senhaAtual">
              Senha atual
              <CampoObrigatorio />
            </Label>
            <Input id="senhaAtual" type="password" {...register("senhaAtual")} />
            {errors.senhaAtual && (
              <p className="text-sm text-destructive">{errors.senhaAtual.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="novaSenha">
              Nova senha
              <CampoObrigatorio />
            </Label>
            <Input id="novaSenha" type="password" {...register("novaSenha")} />
            {errors.novaSenha && (
              <p className="text-sm text-destructive">{errors.novaSenha.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmarSenha">
              Confirmar nova senha
              <CampoObrigatorio />
            </Label>
            <Input id="confirmarSenha" type="password" {...register("confirmarSenha")} />
            {errors.confirmarSenha && (
              <p className="text-sm text-destructive">{errors.confirmarSenha.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}
      {sucesso && <p className="text-sm text-positive">Senha alterada com sucesso.</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </div>
    </form>
  );
}
