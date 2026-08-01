# Requisitos da Fase 3 — PrimeBox ERP

Fase seguinte à Fase 2 (ver [requisitos-fase2.md](requisitos-fase2.md)),
conforme roadmap definido com Ryan: "Estoque de produto acabado e
matéria-prima".

## Escopo

1. Cadastro de matéria-prima (nome + unidade).
2. Registrar movimentações de entrada/saída, para produto acabado e
   matéria-prima.
3. Ver saldo atual e alerta de nível mínimo.

## Fora de escopo nesta fase

- Consumo automático de matéria-prima por produto (exigiria uma "ficha
  técnica"/receita por produto).
- Faturamento (módulo financeiro/boleto) e Expedição — continuam Fase 4
  e 5 do roadmap.

## Status de implementação

| Item | Status | Observações |
|---|---|---|
| Estoque de produto acabado | Implementado e validado localmente | `/estoque` mostra saldo (calculado a partir do histórico de movimentos) e nível mínimo por produto. Concluir uma Ordem de Produção dá entrada automática. Movimentação manual em `/estoque/movimentar/produto/[id]` |
| Estoque de matéria-prima | Implementado e validado localmente | Cadastro em `/estoque/materia-prima/novo`, movimentação manual em `/estoque/movimentar/materia-prima/[id]`. Saída maior que o saldo disponível é bloqueada |

## Decisões de modelagem relevantes

- Ver [ADR-011](../decisoes/ADR-011-estoque.md) — modelo de Estoque e regras de negócio.
