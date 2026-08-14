# Requisitos da Fase 2 — PrimeBox ERP

Fase seguinte ao MVP (ver
[requisitos-mvp.md](requisitos-mvp.md)), conforme roadmap definido com
Ryan: "Ordem de produção e controle de produção".

## Escopo

1. Gerar uma Ordem de Produção (OP) a partir de um item de pedido.
2. Acompanhar OPs em um quadro com 3 estados: Aguardando, Em Produção,
   Concluído.

## Fora de escopo nesta fase

Estoque, Faturamento (módulo financeiro/boleto), Expedição — continuam
como Fase 3, 4 e 5 do roadmap.

## Status de implementação

| Item | Status | Observações |
|---|---|---|
| Ordem de Produção | Implementado e validado localmente | Uma OP por item de pedido (não por pedido inteiro). Criação manual pelo botão "Gerar OP" em `/pedidos/[id]`. Quadro em `/producao` com ações "Iniciar produção" e "Concluir" (sem drag-and-drop). Pedido com item em produção não pode mais ser editado ou excluído |
| OP avulsa (sem Pedido/Cliente formal) | Implementado e validado localmente | `/producao/nova`: formulário de múltiplas linhas (quantidade, produto, cliente livre, observação, preço opcional). Cada linha vira Pedido formal (se o cliente bater com cadastro ou for criado ali) ou entra numa OP avulsa própria (texto livre, fora dos relatórios de Faturamento/Por cliente). Board de `/producao` mescla os dois tipos; recibo com canhoto e "Gerar expedição" disponíveis por linha — ver ADR-033 |

## Decisões de modelagem relevantes

- Ver [ADR-010](../decisoes/ADR-010-ordem-producao.md) — modelo de Ordem de Produção e regras de negócio.
- Ver [ADR-033](../decisoes/ADR-033-op-avulsa.md) — OP avulsa sem Pedido/Cliente formal.
