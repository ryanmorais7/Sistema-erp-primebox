# Requisitos da Fase 5 — PrimeBox ERP

Fase seguinte à Fase 4 (ver [requisitos-fase4.md](requisitos-fase4.md)),
conforme roadmap definido com Ryan: "Expedição, boleto e nota fiscal".
**Implementada só a parte de Expedição** — boleto e nota fiscal ficaram
de fora por decisão explícita (ver ADR-013).

## Escopo implementado

1. Gerar expedição a partir de um pedido (transportadora opcional).
2. Quadro de acompanhamento: Aguardando, Em rota, Entregue.

## Fora de escopo (aguardando decisão)

- **Boleto bancário real**: exige escolher e contratar um gateway de
  pagamento ou banco (ex: Asaas, Iugu) antes de qualquer implementação.
- **Nota fiscal eletrônica (NF-e)**: exige certificado digital e
  integração com a SEFAZ (direta ou via provedor como Focus NFe/eNotas)
  — envolve o contador da PrimeBox, não é só decisão técnica.

## Status de implementação

| Item | Status | Observações |
|---|---|---|
| Expedição | Removida da UI em 2026-08-18 | Ryan pediu pra tirar do menu (rota incluída) — ver ADR-034. Modelo `Expedicao` continua no banco (dado histórico), só não tem mais tela/rota/link em lugar nenhum |
| Boleto real | Não iniciado | Aguardando Ryan decidir/contratar um gateway de pagamento |
| Nota fiscal eletrônica | Não iniciado | Aguardando decisão de certificado digital/provedor de NF-e, envolvendo o contador |

## Decisões de modelagem relevantes

- Ver [ADR-013](../decisoes/ADR-013-expedicao.md) — modelo de Expedição e escopo da fase original.
- Ver [ADR-034](../decisoes/ADR-034-recibo-forma-pagamento-baixa-criacao-expedicao.md) — remoção da Expedição da UI (feature revertida, não nova).
