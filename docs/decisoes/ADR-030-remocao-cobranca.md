# ADR-030: Remoção da funcionalidade de Cobrança/Recibo

- **Status:** Aceito
- **Data:** 2026-08-12

## Contexto

O bloco "Cobrança" na página do pedido aparecia antes do bloco
"Expedição", dando a impressão de ser uma etapa obrigatória — mesmo não
bloqueando de fato a geração de expedição (os dois botões sempre foram
independentes). Ryan pediu pra remover essa etapa da tela do pedido.
Perguntei se era só reordenar/ocultar ali ou remover a feature inteira
(ela também vive em `/faturamento` e `/cobrancas/[id]`); a resposta foi
remover cobranças do sistema inteiro, mantendo intactos os status de
Pedido (`EM_CARTEIRA`/`FATURADO`).

Antes de apagar o modelo, conferi produção: **zero registros de
`Cobranca` existiam** (a única cobrança já criada era dado de teste,
já removido antes desta sessão) — a remoção do modelo não descarta
histórico real de ninguém.

## Decisão

Removidos por completo:

- Modelo `Cobranca` e enum `StatusCobranca` do `schema.prisma`, e o
  campo de relação `cobranca` em `Pedido` (migration
  `20260812021619_remove_cobranca`).
- `/faturamento` (listagem de cobranças com marcar pago/pendente) e
  `/cobrancas/[id]` (recibo) — rotas e actions.
- `/pedidos/[id]/cobranca/nova` (gerar cobrança).
- `src/lib/cobranca.ts` (`statusExibicaoCobranca`, cálculo de
  "Atrasado" por vencimento).
- Item "Financeiro" da sidebar (só continha o link pra `/faturamento`).
- Bloco "Cobrança" e o badge de status de pagamento (Pago/Pendente/
  Atrasado) na página do pedido — o badge no topo do pedido agora
  mostra o status do próprio Pedido (`Em carteira`/`Faturado`), que já
  existia e não depende de cobrança.

Não afetado: `/relatorios/faturamento` (relatório por período, ver
ADR conforme requisitos-fase4 — na verdade é uma consulta direta sobre
`Pedido.status = FATURADO` e `updatedAt`, nunca dependeu de `Cobranca`).

## Consequências

- Fase 4 (Cobrança/Recibo, ver `docs/requisitos/requisitos-fase4.md`)
  deixa de existir no sistema. Se no futuro for necessário cobrar
  boleto/vencimento de verdade, a conversa é a mesma já registrada em
  `docs/decisoes` sobre boleto real (precisa de gateway de pagamento) —
  não é só recriar este modelo.
- `npx tsc --noEmit` e `npm run build` (branch `teste`) rodados limpos
  após a remoção, sem referência solta a `Cobranca`/`cobranca` em
  `src/`.
