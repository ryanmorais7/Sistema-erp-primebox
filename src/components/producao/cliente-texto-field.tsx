"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { criarClienteRapido } from "@/app/(app)/producao/ordem-avulsa/actions";
import { mascararTelefone } from "@/lib/mascaras";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null };

type ClienteTextoFieldProps = {
  texto: string;
  clienteId: string | null;
  clientes: Cliente[];
  onChange: (texto: string, clienteId: string | null) => void;
};

function normalizar(valor: string) {
  return valor.trim().toLowerCase();
}

export function ClienteTextoField({ texto, clienteId, clientes, onChange }: ClienteTextoFieldProps) {
  const [aberto, setAberto] = useState(false);
  const [criando, setCriando] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const termo = normalizar(texto);
  const sugestoes = termo
    ? clientes
        .filter((cliente) => {
          const nome = normalizar(cliente.nomeFantasia || cliente.razaoSocial);
          return nome.includes(termo);
        })
        .slice(0, 6)
    : [];
  const bateExato = clientes.some(
    (cliente) => normalizar(cliente.nomeFantasia || cliente.razaoSocial) === termo,
  );

  function selecionar(cliente: Cliente) {
    onChange(cliente.nomeFantasia || cliente.razaoSocial, cliente.id);
    setAberto(false);
  }

  async function confirmarCriacao() {
    setErro(null);
    setSalvando(true);
    const resultado = await criarClienteRapido({ razaoSocial: texto.trim(), telefone });
    setSalvando(false);
    if (!resultado.success) {
      setErro(resultado.error);
      return;
    }
    onChange(resultado.cliente.nome, resultado.cliente.id);
    setCriando(false);
    setAberto(false);
    setTelefone("");
  }

  return (
    <div className="relative">
      <Input
        value={texto}
        placeholder='Nome do cliente, ou "Avulso"'
        onChange={(e) => {
          onChange(e.target.value, null);
          setAberto(true);
          setCriando(false);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => {
          // Não sobrescreve mais o texto digitado com o nome cadastrado
          // ao sair do campo — só o clique explícito numa sugestão (ou
          // no "Cadastrar") vincula um cliente (ver ADR-035). O texto
          // exibido/salvo continua exatamente o que foi digitado.
          setTimeout(() => setAberto(false), 150);
        }}
      />
      {clienteId && (
        <p className="mt-1 text-xs text-[#0F6E56]">Vinculado a cliente cadastrado</p>
      )}

      {aberto && termo && !criando && (sugestoes.length > 0 || !bateExato) && (
        <div className="absolute z-20 mt-1 w-full min-w-56 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
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
          {!bateExato && (
            <button
              type="button"
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-brand hover:bg-accent"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCriando(true)}
            >
              <UserPlus className="size-3.5" />
              Cadastrar &quot;{texto.trim()}&quot; como cliente
            </button>
          )}
        </div>
      )}

      {criando && (
        <div className="absolute z-20 mt-1 w-full min-w-64 rounded-lg bg-popover p-3 text-popover-foreground shadow-md ring-1 ring-foreground/10">
          <p className="mb-2 text-xs font-medium">
            Cadastrar &quot;{texto.trim()}&quot; como cliente novo
          </p>
          <Input
            placeholder="Telefone"
            inputMode="numeric"
            value={telefone}
            onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
            onMouseDown={(e) => e.stopPropagation()}
          />
          {erro && <p className="mt-1 text-xs text-destructive">{erro}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCriando(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="xs"
              disabled={salvando}
              onMouseDown={(e) => e.preventDefault()}
              onClick={confirmarCriacao}
            >
              {salvando ? "Criando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
