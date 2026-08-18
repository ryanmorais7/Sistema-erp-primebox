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

## Atualização 2026-08-18 — "Pedidos recentes" virou "Pedidos e OPs recentes"

Ryan notou que a lista só mostrava `Pedido` (tabela formal) — OP
avulsa (`OrdemAvulsa`, ver ADR-033) nunca cria um `Pedido`, então
ficava invisível aqui, mesmo sendo, no dia a dia do Pedro, mais comum
que Pedido cadastrado direto em Pedidos. (OP formal criada em Produção
já aparecia, porque por trás das cortinas ela sempre cria um `Pedido`
de verdade — ver `criarOrdemAvulsa` em `producao/ordem-avulsa/actions.ts`.)

- Painel agora busca `Pedido` (top 8 por `createdAt`) e `OrdemAvulsa`
  (top 8 por `createdAt`, com os itens pra achar cliente/valor), junta
  os dois num tipo só (`LinhaRecente`), ordena por `createdAt` e mostra
  as 8 mais recentes — misturando as duas origens numa lista só, em vez
  de duas seções separadas.
- Linha de `Pedido`: mesmo comportamento de antes (`#N`, status Em
  carteira/Faturado, link pro `/pedidos/[id]`).
- Linha de `OrdemAvulsa`: numeração "OP Avulsa #N", cliente é a união
  dos `clienteTexto` dos itens (normalmente só um — a OP inteira é
  agrupada por cliente na criação), valor é a soma
  `precoUnitario × quantidade` dos itens (item sem preço conta como 0,
  mesma convenção do Faturamento por período), badge "Avulsa" no lugar
  de Em carteira/Faturado (não existe esse conceito do lado avulso), e
  link pro recibo (`/producao/recibo/avulsa-grupo/[id]`) — não existe
  uma tela de "ver OP avulsa" além do recibo e do formulário de editar
  (que redireciona se não tiver item Aguardando).
