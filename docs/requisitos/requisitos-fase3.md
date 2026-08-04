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

- Faturamento (módulo financeiro/boleto) e Expedição — continuam Fase 4
  e 5 do roadmap.
- Painel com gráficos comparando fornecedores — ainda não existe
  biblioteca de gráficos no projeto (adiado, ver ADR-016).

## Status de implementação

| Item | Status | Observações |
|---|---|---|
| Estoque de produto acabado | Implementado e validado em produção | `/estoque` mostra saldo (calculado a partir do histórico de movimentos) e nível mínimo por produto. Concluir uma Ordem de Produção dá entrada automática. Movimentação manual em `/estoque/movimentar/produto/[id]` |
| Estoque de matéria-prima | Implementado e validado em produção | Cadastro em `/estoque/materia-prima/novo`, movimentação manual em `/estoque/movimentar/materia-prima/[id]`. Saída maior que o saldo disponível é bloqueada. Coluna "Mínimo" removida da listagem (o alerta "Baixo"/"OK" continua) |
| Fornecedores e comparação de preço | Implementado e validado em produção | Cadastro em `/estoque/fornecedores`; cada matéria-prima pode ter vários fornecedores cotados, com o mais barato destacado |
| Ficha técnica (consumo de matéria-prima por produto) | Implementado e validado em produção | Tela em `/produtos/[id]/ficha-tecnica`. Concluir uma OP agora dá saída automática de matéria-prima com base na ficha técnica do produto. Quantidades reais ainda precisam ser validadas produto a produto com o Pedro — só um produto de exemplo tem ficha preenchida, como demonstração |
| Reorganização visual do Estoque | Implementado e validado localmente | Produtos acabados e Matéria-prima lado a lado (com divisor), cada um com botão minimizar/maximizar e contador de itens; layout centralizado com largura máxima — ver ADR-019 |

## Decisões de modelagem relevantes

- Ver [ADR-011](../decisoes/ADR-011-estoque.md) — modelo de Estoque e regras de negócio.
- Ver [ADR-016](../decisoes/ADR-016-fornecedores-ficha-tecnica.md) — fornecedores, comparação de preço e ficha técnica.
- Ver [ADR-019](../decisoes/ADR-019-painel-interativo-estoque-layout.md) — Painel interativo por mês e reorganização visual do Estoque.
