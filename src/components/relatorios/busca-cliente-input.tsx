"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { normalizarBusca } from "@/lib/texto";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null };

type BuscaClienteInputProps = {
  clientes: Cliente[];
  valorInicial: string;
};

export function BuscaClienteInput({ clientes, valorInicial }: BuscaClienteInputProps) {
  const router = useRouter();
  const [texto, setTexto] = useState(valorInicial);
  const [aberto, setAberto] = useState(false);

  const termo = normalizarBusca(texto);
  const sugestoes = termo
    ? clientes
        .filter((cliente) => normalizarBusca(cliente.nomeFantasia || cliente.razaoSocial).includes(termo))
        .slice(0, 8)
    : [];

  function selecionar(cliente: Cliente) {
    setAberto(false);
    router.push(`/relatorios/clientes?clienteId=${cliente.id}`);
  }

  return (
    <div className="flex max-w-md gap-2">
      <div className="relative flex-1">
        <Input
          name="q"
          value={texto}
          placeholder="Buscar por nome do cliente"
          autoComplete="off"
          onChange={(e) => {
            setTexto(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
        />
        {aberto && sugestoes.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
            {sugestoes.map((cliente) => (
              <button
                key={cliente.id}
                type="button"
                className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selecionar(cliente)}
              >
                {cliente.nomeFantasia || cliente.razaoSocial}
              </button>
            ))}
          </div>
        )}
      </div>
      <Button type="submit">Buscar</Button>
    </div>
  );
}
