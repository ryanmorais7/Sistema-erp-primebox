# ADR-025: Navegação rápida a partir dos cards e da lista do Painel

- **Status:** Aceito
- **Data:** 2026-08-08

## Contexto

Ryan pediu pra reduzir cliques: o Pedro reclama de ter que usar a sidebar
toda vez. Os 4 cards de resumo do Painel (pedidos em carteira, faturados,
clientes ativos, valor em carteira) e as linhas de "Pedidos recentes" eram
só informativos, sem link.

## Decisão

- Os cards "Pedidos em carteira" e "Valor em carteira" levam pra
  `/pedidos?status=EM_CARTEIRA`; "Pedidos faturados" leva pra
  `/pedidos?status=FATURADO` — reaproveitando o filtro por abas que a
  tela de Pedidos já tinha. "Clientes ativos" leva pra `/clientes`.
- Cada linha da tabela "Pedidos recentes" leva pro pedido correspondente
  (`/pedidos/[id]`).
- Os cards usam `<Link>` normal envolvendo o `Card` (são `<div>`, sem
  necessidade de JS extra). As linhas da tabela precisaram de um
  componente cliente pequeno (`LinhaPedidoRecente`) com
  `router.push` no `onClick` — diferente dos cards, `<tr>` não pode virar
  `<a>` diretamente, e a página do Painel é Server Component.
- Os cards continuam refletindo o mês selecionado no gráfico (não mudei
  esse comportamento), mas o link sempre aponta pro pedido/cliente sem
  filtro de mês — o filtro por mês é só visual no Painel, não existe
  esse conceito nas telas de Pedidos/Clientes.

## Consequências

Nenhuma mudança de schema. Comportamento aditivo — quem clicava sem
querer no meio do card antes não tinha efeito nenhum; agora navega.
