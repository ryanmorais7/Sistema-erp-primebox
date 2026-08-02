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
| Expedição | Implementado e validado localmente | Gerada a partir de qualquer pedido (`/pedidos/[id]/expedicao/nova`), sem exigir pedido faturado. Quadro em `/expedicao` com ações "Iniciar rota" e "Marcar entregue" |
| Boleto real | Não iniciado | Aguardando Ryan decidir/contratar um gateway de pagamento |
| Nota fiscal eletrônica | Não iniciado | Aguardando decisão de certificado digital/provedor de NF-e, envolvendo o contador |

## Decisões de modelagem relevantes

- Ver [ADR-013](../decisoes/ADR-013-expedicao.md) — modelo de Expedição e escopo da fase.
