# ADR-018: Gráfico de faturamento no Painel

- **Status:** Aceito
- **Data:** 2026-08-03

## Contexto

Item que tinha ficado deliberadamente adiado desde o início do
projeto (nunca havia biblioteca de gráficos instalada). Ryan pediu
para priorizar este em vez do gráfico de comparação de fornecedores
(também pendente) — fica para uma próxima sessão.

## Decisão

**Biblioteca: Recharts.** É a opção padrão usada com shadcn/ui, leve,
sem dependência de Radix (o projeto usa Base UI, não Radix — ver nota
em componentes anteriores). Instalada direto (`recharts`), sem o
wrapper `ChartContainer` do shadcn — o gráfico é simples o bastante
(uma única barra) para não precisar da camada extra de abstração.

**Dados: últimos 6 meses, agrupados pelo mesmo `updatedAt` que já
serve de data de faturamento** no relatório de faturamento por dia
(ver ADR-009) — um pedido faturado nunca mais é editado, então o
momento da transição pra `FATURADO` continua confiável como "data em
que faturou". Agrupamento por mês feito em JS (não SQL) usando
`Intl.DateTimeFormat` com timezone `America/Sao_Paulo`, mesma
convenção de `src/lib/data.ts`, só que por mês em vez de por dia —
evita depender de `date_trunc` do Postgres, que teria que lidar com
timezone no banco em vez de na aplicação.

Meses sem faturamento aparecem com barra zerada (não somem do
gráfico) — dá visão de continuidade mesmo com histórico curto.

## Consequências

- Card "Faturamento (últimos 6 meses)" no Painel (`/`), entre os
  cartões de resumo e a tabela de pedidos recentes.
- Se o volume de pedidos crescer muito, uma única consulta buscando
  todos os pedidos faturados dos últimos 6 meses e agrupando em
  memória pode precisar virar uma agregação no banco — não é um
  problema agora, com o volume atual.
- Gráfico de comparação de fornecedores (pedido original do Pedro)
  continua pendente — próximo item da lista.
