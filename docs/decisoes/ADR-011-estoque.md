# ADR-011: Estoque de produto acabado e matéria-prima (Fase 3)

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

Fase 3 do roadmap. Três decisões de modelagem confirmadas com Ryan
antes da implementação.

## Decisão

```prisma
enum TipoMovimentoEstoque {
  ENTRADA
  SAIDA
}

model MateriaPrima {
  id            String   @id @default(cuid())
  nome          String
  unidade       String
  estoqueMinimo Decimal  @default(0) @db.Decimal(10, 2)
  ativo         Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  movimentos MovimentoEstoqueMateriaPrima[]
}

model MovimentoEstoqueProduto {
  id         String               @id @default(cuid())
  produtoId  String
  produto    Produto              @relation(fields: [produtoId], references: [id])
  tipo       TipoMovimentoEstoque
  quantidade Decimal              @db.Decimal(10, 2)
  observacao String?
  createdAt  DateTime             @default(now())
}

model MovimentoEstoqueMateriaPrima {
  id             String               @id @default(cuid())
  materiaPrimaId String
  materiaPrima   MateriaPrima         @relation(fields: [materiaPrimaId], references: [id])
  tipo           TipoMovimentoEstoque
  quantidade     Decimal              @db.Decimal(10, 2)
  observacao     String?
  createdAt      DateTime             @default(now())
}
```

`Produto` ganhou um campo `estoqueMinimo` (igual `MateriaPrima`).

- **Matéria-prima é cadastro novo e simples** (nome + unidade), sem
  vincular quanto cada produto consome — implementar uma "ficha
  técnica"/receita por produto ficaria para uma fase futura, se for
  necessário.
- **Saldo é sempre calculado a partir do histórico de movimentos**
  (`entrada - saída`, via `groupBy`), não um campo denormalizado —
  evita o saldo dessincronizar do que foi de fato lançado. Ver
  `src/lib/estoque.ts`.
- **Saída maior que o saldo disponível é bloqueada** no servidor (para
  produto e para matéria-prima) — não permite estoque negativo.
- **Concluir uma Ordem de Produção gera entrada automática** no estoque
  do produto acabado correspondente, na mesma quantidade do item do
  pedido (`producao/actions.ts`, `concluirProducao`). Não há baixa
  automática de matéria-prima (ver ponto acima).
- **Nível mínimo com alerta visual**: cada produto/matéria-prima tem um
  `estoqueMinimo`; a tela de Estoque mostra um badge "Baixo" quando o
  saldo atual fica abaixo desse valor.

## Consequências

- Sidebar: "Estoque" sai do grupo "em breve" e vira link ativo.
- Se no futuro for necessário saber quanto de matéria-prima cada
  produto consome (para dar baixa automática ao produzir), será preciso
  introduzir um modelo de "ficha técnica" — não existe hoje.
- O saldo é recalculado a cada carregamento da tela de Estoque a partir
  de todos os movimentos históricos; se o volume de movimentos crescer
  muito ao longo dos anos, pode valer a pena revisitar para um saldo
  denormalizado com cache — não é um problema na escala atual.
