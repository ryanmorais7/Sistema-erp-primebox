# Requisitos da Fase 4 — PrimeBox ERP

> **Removida em 2026-08-12** — ver [ADR-030](../decisoes/ADR-030-remocao-cobranca.md).
> Este documento fica só como registro histórico do que foi construído
> e depois removido a pedido do Ryan.

Fase seguinte à Fase 3 (ver [requisitos-fase3.md](requisitos-fase3.md)),
conforme roadmap definido com Ryan: "Faturamento, cobrança e recibos".

## Escopo

1. Gerar uma cobrança a partir de um pedido faturado.
2. Controlar status da cobrança: Pendente, Pago (Atrasado é calculado
   automaticamente pelo vencimento).
3. Recibo — tela de visualização/impressão da cobrança.

## Fora de escopo nesta fase

- Cobrança avulsa (sem pedido).
- Emissão real de boleto bancário (integração com banco/gateway de
  pagamento) — fica para Fase 5, junto com Expedição e nota fiscal.

## Status de implementação

| Item | Status | Observações |
|---|---|---|
| Cobrança | Implementado e validado localmente | Gerada a partir de um pedido faturado (`/pedidos/[id]/cobranca/nova`), sempre 1:1 com o pedido. Valor sempre lido do pedido (nunca duplicado) |
| Recibo | Implementado | `/cobrancas/[id]` — mesmo padrão de impressão do pedido (ADR-007), com botão para marcar como pago/pendente |
| Faturamento (listagem) | Implementado | `/faturamento` lista todas as cobranças, com status "Atrasado" calculado pelo vencimento |

## Decisões de modelagem relevantes

- Ver [ADR-012](../decisoes/ADR-012-cobranca-recibo.md) — modelo de Cobrança e regras de negócio.
