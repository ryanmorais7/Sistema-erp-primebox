"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { atualizarCliente, criarCliente } from "@/app/(app)/clientes/actions";
import { clienteSchema, UFS, type ClienteFormValues } from "@/lib/validations/cliente";
import { mascararCnpj, mascararCpf, mascararCep, mascararTelefone } from "@/lib/mascaras";
import { CampoObrigatorio } from "@/components/ui/campo-obrigatorio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ufItems = Object.fromEntries(UFS.map((uf) => [uf, uf]));

const valoresPadrao: ClienteFormValues = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  cpf: "",
  telefone: "",
  email: "",
  contatoNome: "",
  endereco: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
};

type ClienteFormProps = {
  clienteId?: string;
  valoresIniciais?: ClienteFormValues;
};

export function ClienteForm({ clienteId, valoresIniciais }: ClienteFormProps) {
  const router = useRouter();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: valoresIniciais ?? valoresPadrao,
  });

  async function aoSubmeter(dados: ClienteFormValues) {
    setErroGeral(null);
    const resultado = clienteId
      ? await atualizarCliente(clienteId, dados)
      : await criarCliente(dados);

    if (!resultado.success) {
      setErroGeral(resultado.error);
      for (const [campo, mensagem] of Object.entries(resultado.camposComErro ?? {})) {
        setError(campo as keyof ClienteFormValues, { message: mensagem });
      }
      return;
    }

    router.push("/clientes");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="razaoSocial">
              Razão social
              <CampoObrigatorio />
            </Label>
            <Input id="razaoSocial" {...register("razaoSocial")} />
            {errors.razaoSocial && (
              <p className="text-sm text-destructive">{errors.razaoSocial.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="nomeFantasia">Nome fantasia</Label>
            <Input id="nomeFantasia" {...register("nomeFantasia")} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cnpj">
              CNPJ
              <CampoObrigatorio />
            </Label>
            <Controller
              control={control}
              name="cnpj"
              render={({ field }) => (
                <Input
                  id="cnpj"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(mascararCnpj(e.target.value))}
                  onBlur={field.onBlur}
                  placeholder="00.000.000/0000-00"
                  inputMode="numeric"
                />
              )}
            />
            {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cpf">
              CPF
              <CampoObrigatorio />
            </Label>
            <Controller
              control={control}
              name="cpf"
              render={({ field }) => (
                <Input
                  id="cpf"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(mascararCpf(e.target.value))}
                  onBlur={field.onBlur}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              )}
            />
            {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="telefone">
              Telefone
              <CampoObrigatorio />
            </Label>
            <Controller
              control={control}
              name="telefone"
              render={({ field }) => (
                <Input
                  id="telefone"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(mascararTelefone(e.target.value))}
                  onBlur={field.onBlur}
                  placeholder="(00) 00000-0000"
                  inputMode="numeric"
                />
              )}
            />
            {errors.telefone && (
              <p className="text-sm text-destructive">{errors.telefone.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="contatoNome">Nome do contato</Label>
            <Input id="contatoNome" {...register("contatoNome")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-2 sm:col-span-3">
            <Label htmlFor="endereco">Endereço</Label>
            <Input id="endereco" {...register("endereco")} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="numero">Número</Label>
            <Input id="numero" {...register("numero")} />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input id="bairro" {...register("bairro")} />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" {...register("cidade")} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>UF</Label>
            <Controller
              control={control}
              name="estado"
              render={({ field }) => (
                <Select
                  items={ufItems}
                  value={field.value || null}
                  onValueChange={(valor) => field.onChange(valor ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {UFS.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.estado && <p className="text-sm text-destructive">{errors.estado.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cep">CEP</Label>
            <Controller
              control={control}
              name="cep"
              render={({ field }) => (
                <Input
                  id="cep"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(mascararCep(e.target.value))}
                  onBlur={field.onBlur}
                  placeholder="00000-000"
                  inputMode="numeric"
                />
              )}
            />
            {errors.cep && <p className="text-sm text-destructive">{errors.cep.message}</p>}
          </div>
        </CardContent>
      </Card>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/clientes")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
