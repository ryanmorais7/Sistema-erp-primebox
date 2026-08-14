"use client";

import { useState } from "react";
import { PackagePlus } from "lucide-react";
import { criarProdutoRapido } from "@/app/(app)/producao/ordem-avulsa/actions";
import { precoParaNumero, formatarPrecoBr } from "@/lib/validations/moeda";
import { TIPOS_PRODUTO, tipoProdutoLabels } from "@/lib/validations/produto";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Produto = { id: string; nome: string; preco: number };
type Medida = { id: string; nome: string };

type ProdutoTextoFieldProps = {
  texto: string;
  produtoId: string;
  produtos: Produto[];
  medidas: Medida[];
  onChange: (texto: string, produto: Produto | null) => void;
};

function normalizar(valor: string) {
  return valor.trim().toLowerCase();
}

export function ProdutoTextoField({
  texto,
  produtoId,
  produtos,
  medidas,
  onChange,
}: ProdutoTextoFieldProps) {
  const [aberto, setAberto] = useState(false);
  const [criando, setCriando] = useState(false);
  const [tipo, setTipo] = useState<(typeof TIPOS_PRODUTO)[number]>("BASE");
  const [medidaId, setMedidaId] = useState(medidas[0]?.id ?? "");
  const [preco, setPreco] = useState("");
  const [custo, setCusto] = useState("0");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const termo = normalizar(texto);
  const sugestoes = termo
    ? produtos.filter((produto) => normalizar(produto.nome).includes(termo)).slice(0, 6)
    : [];
  const bateExato = produtos.some((produto) => normalizar(produto.nome) === termo);

  function selecionar(produto: Produto) {
    onChange(produto.nome, produto);
    setAberto(false);
  }

  async function confirmarCriacao() {
    setErro(null);
    setSalvando(true);
    const resultado = await criarProdutoRapido({
      nome: texto.trim(),
      tipo,
      medidaId,
      preco: preco || "0",
      custo: custo || "0",
    });
    setSalvando(false);
    if (!resultado.success) {
      setErro(resultado.error);
      return;
    }
    onChange(resultado.produto.nome, resultado.produto);
    setCriando(false);
    setAberto(false);
    setPreco("");
  }

  return (
    <div className="relative">
      <Input
        value={texto}
        placeholder="Nome do produto"
        onChange={(e) => {
          onChange(e.target.value, null);
          setAberto(true);
          setCriando(false);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
      />
      {produtoId && <p className="mt-1 text-xs text-[#0F6E56]">Vinculado ao catálogo</p>}

      {aberto && termo && !criando && (sugestoes.length > 0 || !bateExato) && (
        <div className="absolute z-20 mt-1 w-full min-w-64 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {sugestoes.map((produto) => (
            <button
              key={produto.id}
              type="button"
              className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selecionar(produto)}
            >
              {produto.nome}
            </button>
          ))}
          {!bateExato && (
            <button
              type="button"
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-brand hover:bg-accent"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCriando(true)}
            >
              <PackagePlus className="size-3.5" />
              Cadastrar &quot;{texto.trim()}&quot; como produto
            </button>
          )}
        </div>
      )}

      {criando && (
        <div
          className="absolute z-20 mt-1 w-72 rounded-lg bg-popover p-3 text-popover-foreground shadow-md ring-1 ring-foreground/10"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <p className="mb-2 text-xs font-medium">
            Cadastrar &quot;{texto.trim()}&quot; como produto novo
          </p>
          <div className="flex flex-col gap-2">
            <Select items={tipoProdutoLabels} value={tipo} onValueChange={(v) => setTipo(v as (typeof TIPOS_PRODUTO)[number])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_PRODUTO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {tipoProdutoLabels[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              items={Object.fromEntries(medidas.map((m) => [m.id, m.nome]))}
              value={medidaId}
              onValueChange={(v) => setMedidaId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Medida" />
              </SelectTrigger>
              <SelectContent>
                {medidas.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Preço (R$)"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                onBlur={() => {
                  if (!preco.trim()) return;
                  const numero = precoParaNumero(preco);
                  if (Number.isFinite(numero) && numero > 0) setPreco(formatarPrecoBr(numero));
                }}
              />
              <Input
                placeholder="Custo (R$)"
                value={custo}
                onChange={(e) => setCusto(e.target.value)}
              />
            </div>
          </div>
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
              disabled={salvando || !medidaId}
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
