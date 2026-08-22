"use client";

import type * as React from "react";

import { Input } from "@/components/ui/input";

type ProdutoTextoFieldProps = {
  texto: string;
  onChange: (texto: string) => void;
  ref?: React.Ref<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
};

// Texto 100% livre — sem sugestão/autocomplete puxando do catálogo de
// Produtos e sem nenhuma correspondência automática que altere o texto
// exibido (ver ADR-035). O servidor resolve por conta própria ao salvar
// (vincula a um produto existente ou cadastra um novo a partir do texto
// digitado), mas o texto exibido aqui e depois na OP é sempre exatamente
// o que foi digitado, nunca o nome do cadastro.
export function ProdutoTextoField({ texto, onChange, ref, onKeyDown }: ProdutoTextoFieldProps) {
  return (
    <Input
      ref={ref}
      value={texto}
      placeholder="Nome do produto"
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}
