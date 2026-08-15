# ADR-033: OP avulsa direto em Produção, sem exigir Pedido/Cliente formal

- **Status:** Aceito
- **Data:** 2026-08-14

## Contexto

O Pedro faz muita produção avulsa no dia a dia (pra conhecidos, clientes
ocasionais), sem cadastro formal de cliente nem passar pela tela de
Pedidos. Hoje ele controla isso numa planilha simples: quantidade,
produto, nome do cliente (texto livre, às vezes "Avulso"), observação.
O fluxo formal (Cliente cadastrado → Pedido → OP) continua necessário
pra clientes recorrentes (histórico, cobrança), mas não pode ser o
único caminho.

## Decisão

### Tabelas novas, isoladas do fluxo formal

`OrdemAvulsa` (numeração própria "OP Avulsa #N") e `ItemOrdemAvulsa`
(quantidade, produto, `clienteTexto` livre, `clienteId` opcional só
informativo, observação, preço opcional, status próprio — mesmo enum
`StatusOrdemProducao` do fluxo formal). O relatório "Por cliente"
continua consultando só `Pedido`/`Cliente` — nunca toca nessas tabelas
novas, então produção avulsa não polui um cliente real com nomes
avulsos diferentes. **Atualização 2026-08-15:** "Faturamento por
período" passou a somar também os itens avulsos concluídos — ver seção
mais abaixo.

`Expedicao.pedidoId` virou opcional e ganhou `itemOrdemAvulsaId`
opcional (mutuamente exclusivos, garantido na camada de ação, não no
banco) — permite gerar expedição a partir de uma linha avulsa
concluída.

### Uma tela, split automático por linha

Em vez de dois formulários separados, `/producao/nova` é um formulário
único de múltiplas linhas (quantidade, produto, cliente, observação,
preço). Ao salvar (`criarOrdemAvulsa`), cada linha é decidida
individualmente:

- **Cliente com cadastro bate ou é criado ali mesmo** (autocomplete com
  opção "Cadastrar '{texto}' como cliente", via `criarClienteRapido`)
  → linha vira **Pedido formal de verdade** (agrupando por cliente
  dentro da mesma submissão, igual à importação de planilha —
  ADR-031): cria/reaproveita 1 Pedido por cliente distinto, com
  ItemPedido + OrdemProducao normais, numeração "OP #N" e tudo
  integrado aos relatórios.
- **Texto livre sem cadastro** ("Avulso", nome não encontrado) → todas
  as linhas nessa situação, na mesma submissão, viram **uma única**
  `OrdemAvulsa` com várias `ItemOrdemAvulsa`.

Preço é opcional nos dois casos; se vazio no caminho formal, cai no
preço de catálogo do produto (mesma regra de outros fluxos do
sistema). No caminho avulso, fica só de referência pro recibo — não
gera cobrança automática nem afeta Estoque além da baixa já descrita.

O campo Produto segue o mesmo padrão do Cliente: texto livre com
autocomplete contra o catálogo existente e opção "Cadastrar '{texto}'
como produto" ali mesmo (`criarProdutoRapido`), pedindo só tipo,
medida e preço (custo default 0) — sem forçar sair da tela pra
cadastrar produto novo antes de lançar a OP.

Diferente do Cliente, Produto não pode ficar "sem cadastro" de verdade
— toda linha precisa de um `produtoId` real (estoque e ficha técnica
dependem disso). Então se o usuário só digitar um nome que não bate
com nada e não usar o popup, `criarOrdemAvulsa` cadastra o produto
sozinho no momento de salvar: casa por nome exato primeiro (evita
duplicar catálogo), senão cria um novo inferindo a medida a partir do
texto (reaproveita `inferirMedidaId` da importação de planilha,
ADR-031), tipo "Base" e custo 0 por padrão — preço vem do que foi
digitado na linha, ou 0. Fica editável depois em `/produtos`.

### Ajustes de usabilidade no formulário

Preço usa uma máscara de centavos só-dígito (`mascararMoeda`, estilo
maquininha: "15000" digitado vira "150,00"), em vez de texto livre —
evita letra misturada com número. Quantidade começa em branco em vez
de pré-preenchida com 1. Cada linha ganhou um campo opcional **Data
programada** (`dataProgramada DateTime? @db.Date` em
`ItemOrdemAvulsa`, só no caminho avulso) pra agendar produção pra uma
data futura sem precisar criar a OP só no dia — aparece no cartão do
board ("Programado pra 17/08"), formatado sempre em UTC pra não voltar
um dia por causa do fuso horário do Brasil. Por enquanto é só
informativo: não filtra nem ordena o board.

### Board de Produção mesclado, folha impressa unificada

`/producao` busca `OrdemProducao` e `ItemOrdemAvulsa` juntos, mescla
num tipo `Cartao` comum e ordena tudo por `createdAt` (FIFO real,
cruzando as duas origens). Cartões avulsos têm uma badge "avulsa" pra
diferenciar visualmente. Agrupamento por cor na folha impressa usa
`clienteId` (formal) ou `clienteTexto` normalizado (avulsa) como chave
— mesmo texto livre repetido agrupa junto.

### Reaproveitamento

A baixa de estoque ao concluir (entrada de produto acabado + saída de
matéria-prima pela ficha técnica) foi extraída pra
`darBaixaProducaoConcluida()` em `src/lib/estoque.ts`, chamada pelos
dois fluxos. O recibo com canhoto virou um componente compartilhado
(`ReciboLinha`), usado por `/producao/recibo/formal/[id]` e
`/producao/recibo/avulsa/[id]` — o avulso simplesmente não recebe
`clienteSecundaria`/`clienteEndereco`, então esses campos somem do
recibo sem lógica condicional extra no componente.

### Cancelar OP em qualquer etapa, com estorno automático

"Cancelar OP" aparece nas três colunas do board (Aguardando, Em
produção, Concluído), nos dois fluxos. Cancelar uma OP já concluída
estorna o estoque automaticamente via
`reverterBaixaProducaoConcluida()` (saída do produto acabado, entrada
de volta das matérias-primas da ficha técnica) — sempre lançando
movimentos novos, nunca apagando o histórico de movimentos já
existente. Testado localmente: saldo volta exatamente ao valor de
antes da conclusão. Uma linha avulsa que já tem expedição gerada não
pode mais ser cancelada (travado em `cancelarItemOrdemAvulsa`, mesma
lógica de proteção que `excluirPedido` já usa pro fluxo formal) — isso
evitaria deixar uma expedição órfã.

## Atualização 2026-08-15

Ajustes de uso real depois de o Pedro/Ryan testarem o board no dia a
dia:

- **Botão "Voltar"** (`voltarOrdemProducao`/`voltarProducaoAvulsa`):
  volta um passo (Em produção → Aguardando, Concluído → Em produção)
  sem apagar a OP — reaproveita `reverterBaixaProducaoConcluida()` pra
  estornar o estoque quando volta de Concluído. Existe pra não
  precisar cancelar a OP inteira só porque desistiu de ter
  iniciado/concluído por engano. Mesma trava de expedição já existente
  no cancelar.
- **Data de criação visível no card** ("Criada em DD/MM"): a data no
  topo da folha impressa é só a data de impressão daquele lote (por
  isso o rótulo virou "Impresso em"), não a data de lançamento de cada
  OP — sem isso não dava pra saber qual item tava mais atrasado
  (parado em Aguardando, ou em Concluído esperando gerar expedição).
- **Faturamento por período passou a somar avulso**: decisão explícita
  do Pedro/Ryan, revertendo o isolamento original — ele precisa do
  total do dia incluindo avulso, mesmo sabendo que mistura com o
  relatório oficial por Pedido. A data usada é `updatedAt` do
  `ItemOrdemAvulsa` no momento em que vira CONCLUIDO (mesma convenção
  de "data de faturamento" já usada pra Pedido, ADR-009). O relatório
  "Por cliente" **não** mudou — continua só formal, já que a maioria
  das linhas avulsas não tem `clienteId` real pra agrupar.
- **Folha de produção da fábrica** (`/producao`, tabela de cima —
  diferente do recibo com canhoto): fonte de Quantidade/Produto agora
  escala pelo número de linhas (grande com poucas linhas, menor com
  10+, pra caber numa página só) e ganhou uma coluna "Feito" com um
  quadrado vazio (~28px) pra marcar à caneta — sem campo de assinatura
  nem responsável, porque esse controle já fica registrado no sistema
  quando o Pedro marca como concluído na tela.

## Atualização 2026-08-15 (parte 2)

Mais uma rodada de ajustes de uso real:

- **Data programada virou um campo único no topo do formulário**
  (`dataProgramada` subiu de `linhaOrdemAvulsaSchema` pra
  `criarOrdemAvulsaSchema`), em vez de um campo por linha. Na prática
  quase toda OP tem uma data de produção só — ter que repetir por
  linha era fricção sem ganho. Só se aplica às linhas que viram
  avulsas; linhas que viram Pedido formal não têm esse campo (Pedido
  não guarda data programada).
- **Enter não submete mais o formulário** de Criar OP
  (`ordem-avulsa-form.tsx`, `onKeyDown` no `<form>` bloqueando
  `Enter`). O Pedro preenche por hábito de Excel e às vezes apertava
  Enter sem querer, iniciando a OP antes de terminar de preencher —
  agora só o clique no botão laranja "Criar OP" submete.
- **"Impresso em" some da impressão** (`print:hidden` em
  `/producao`), mas continua visível na tela — o rótulo foi adicionado
  na atualização anterior pra resolver a ambiguidade da data no topo
  da folha, mas imprimir essa hora/data junto com a logo não ficava
  bom no papel.
- **Painel (dashboard) também soma avulso no gráfico de faturamento
  mensal**: mesma lógica que "Faturamento por período" já usava desde
  a atualização anterior (soma `ItemOrdemAvulsa` CONCLUIDO por
  `updatedAt`), agora replicada no card/gráfico da página inicial —
  o Pedro deixou claro que toda produção, avulsa ou não, precisa
  contar pro ganho diário/mensal/anual da empresa. "Pedidos em
  carteira", "valor em carteira" e "clientes ativos" continuam só
  formais (avulso não tem carteira nem cliente confiável pra contar).

## Atualização 2026-08-15 (parte 3)

Mais um ajuste no card e na folha, depois de testar a impressão real:

- **Card do board não mostra mais "Criada em"/"Programado pra"**: as
  duas linhas de data foram removidas do card do kanban
  (`/producao`). O card ficou só com número da OP, cliente, produto e
  ações — a data programada virou responsabilidade só do cabeçalho da
  folha impressa (ver próximo item), não precisa se repetir em cada
  card.
- **Cabeçalho da folha (`Impresso em` / `Uso interno · Fábrica`) agora
  reflete a data programada, e volta a aparecer na impressão**: se
  todas as linhas pendentes que estão sendo impressas têm a mesma
  `dataProgramada`, o cabeçalho mostra "Programado pra DD/MM" — visível
  tanto na tela quanto no papel, porque é justamente essa informação
  que o funcionário da fábrica precisa ver quando imprimir a folha
  (criar hoje uma OP pra segunda-feira, e só clicar em imprimir no dia
  já mostra "17", sem depender de quando foi de fato impresso). Sem
  data programada (ou com datas diferentes misturadas na mesma folha),
  cai de volta pro comportamento anterior: "Impresso em {hoje}",
  visível só na tela (`print:hidden`).

## Atualização 2026-08-15 (parte 4)

Testando com duas OPs de datas diferentes (17 e 19) na folha ao mesmo
tempo, apareceu o problema previsto na atualização anterior: o
cabeçalho caía pro "Impresso em hoje" (esperado, já que as datas não
batem), mas não tinha como imprimir só uma das duas — clicar em
"Imprimir" mandava a folha inteira, misturando OPs de dias diferentes
no mesmo papel.

- **Linha da folha agora é clicável, e filtra o que vai pra
  impressão**: virou um componente cliente (`FolhaProducao`, em
  `src/components/producao/folha-producao.tsx` — extraído de
  `/producao/page.tsx`, que agora só monta os dados e passa como
  prop). Clicar numa linha da tabela: (1) destaca ela na tela com uma
  borda, (2) troca o cabeçalho pra mostrar a data programada *daquela
  linha* especificamente (em vez de exigir que todas as linhas
  pendentes compartilhem a mesma data), (3) esconde as outras linhas
  só na impressão (`print:hidden` por linha) — assim dá pra imprimir a
  OP do dia 17 sozinha, depois clicar na do dia 19 e imprimir de novo.
  Clicar de novo na mesma linha desmarca e volta a imprimir tudo junto
  (comportamento padrão, sem seleção). Total de peças também passa a
  refletir só a linha selecionada quando há uma.
- **Coluna Cliente não é mais itálico** na folha impressa — era só
  estética, sem motivo funcional, e dificultava a leitura no papel.

## Atualização 2026-08-15 (parte 5)

- **Card volta a mostrar a data programada**, mas como uma etiqueta
  compacta ao lado da badge "avulsa" (ex: "📅 21/08"), não mais como
  linha separada abaixo do cliente (removida na parte 3).
- **Campo `pago` (Boolean, padrão `false`) em `ItemOrdemAvulsa`**
  (migration `20260815160924_adiciona_pago_item_avulsa`): controle
  simples e binário de "o cliente já pagou essa venda avulsa", sem
  vencimento/atraso — só pago ou pendente. Aparece como um botão no
  card (verde "Pago" / vermelho "Pendente", `alternarPagamentoAvulsa`)
  em qualquer status da OP. Existe **independente** do status de
  produção: concluir a produção já conta como ganho no Painel de
  qualquer forma (ver parte 1), então esse campo é só pra saber se o
  dinheiro entrou de fato — não bloqueia nem afeta nenhum outro fluxo.
  Só existe pro lado avulso; Pedido formal já tem seu próprio status
  (`Em carteira`/`Faturado`) e não ganhou esse campo.

  Vale registrar o contexto: um badge parecido (Pago/Pendente/Atrasado)
  existiu antes na tela do Pedido formal e foi **removido de propósito**
  em 12/08 (ver ADR-030) por dar a impressão de etapa obrigatória antes
  da expedição. Este aqui é deliberadamente mais simples (sem
  vencimento/atraso, só binário) e escopado só pro avulso — decisão
  confirmada com o Ryan antes de implementar, pra não reverter o ADR-030
  sem querer.

## Atualização 2026-08-15 (parte 6) — três bugs

- **`dataProgramada` não existia no lado formal**: o campo único no
  topo do Criar OP só era salvo em `ItemOrdemAvulsa` — linhas que
  viravam Pedido formal (cliente já cadastrado) perdiam a data
  silenciosamente. Adicionado `dataProgramada DateTime? @db.Date` em
  `OrdemProducao` (migration
  `20260815163710_adiciona_data_programada_ordem_producao`), espelhando
  o campo já existente em `ItemOrdemAvulsa`, e `criarOrdemAvulsa` agora
  grava o mesmo valor nos dois lados (`tx.ordemProducao.create` também
  recebe `dataProgramada: dataProgramadaParsed`). Card formal e folha
  impressa passam a mostrar a data corretamente pros dois fluxos.
- **Recibo mostrava a data errada**: `/producao/recibo/avulsa/[id]` e
  `/producao/recibo/formal/[id]` sempre mostravam a data de *criação*
  (`ordemAvulsa.createdAt` / `pedido.createdAt`), nunca a
  `dataProgramada` — então uma OP marcada pra semana que vem aparecia
  no recibo com a data de hoje. Corrigido pra preferir
  `dataProgramada` quando existir, caindo pra data de criação senão.
  Nessa correção também apareceu um bug latente: `dataProgramada` é
  `@db.Date` (só data, meia-noite UTC) e o formatador de
  `ReciboLinha` usava o fuso local — formatar direto voltaria um dia
  no horário do Brasil (mesma armadilha já documentada nas partes
  anteriores pro board). `ReciboLinha` agora recebe a data **já
  formatada** como string (prop `dataFormatada`, no lugar de `data:
  Date`) — cada página escolhe o formatador certo: UTC fixo pra
  `dataProgramada`, fuso local pra timestamp de criação.
- **Ordem dos botões Concluir/Voltar invertida**: no card "Em
  produção", "Concluir" aparecia antes de "Voltar". Trocado pra
  Voltar → Concluir (JSX reordenado em `/producao`), sem mudar nenhum
  comportamento, só a ordem visual dos botões.

## Atualização 2026-08-15 (parte 7) — editar OP avulsa

Não existia nenhuma forma de corrigir uma OP avulsa depois de criada
(só cancelar e recriar do zero). Adicionado:

- **Nova rota `/producao/avulsa/[id]/editar`** e action
  `atualizarItemOrdemAvulsa` (`ordem-avulsa/actions.ts`), com
  `EditarItemAvulsaForm` — uma versão de linha única do formulário de
  Criar OP (mesmos campos e mesmos componentes reaproveitados:
  `ProdutoTextoField`, `ClienteTextoField`, máscara de preço). Resolve
  o produto do mesmo jeito que a criação: por id, por nome exato, ou
  cadastra um produto novo a partir do texto digitado.
- **Só permitido enquanto a OP está "Aguardando"** — trava tanto na
  action quanto na própria página (redireciona se o status já mudou).
  Depois que a produção inicia (e principalmente depois de concluir,
  quando já deu baixa no estoque), editar produto/quantidade deixaria
  os dados inconsistentes com o que já foi de fato produzido/baixado —
  mesma lógica de trava já usada em cancelar/voltar.
- **Botão "Editar" no card**, visível só pra OP avulsa em Aguardando
  (ao lado de "Gerar recibo"). Só pro lado avulso — Pedido formal já
  tem seu próprio `/pedidos/[id]/editar`, embora esse hoje bloqueie
  edição de pedidos cuja OP já foi criada (o que é sempre o caso nesse
  fluxo); ajustar isso é uma decisão separada, fora do escopo daqui.

## Atualização 2026-08-15 (parte 8) — esclarecimento e seleção múltipla

O Ryan reportou como "bug crítico" o board mostrando "OP Avulsa #20"
repetida em cards separados com status/cancelar individuais, achando
que o schema estava criando OPs raiz duplicadas em vez de uma só com
vários itens. Investigado antes de mexer em qualquer código: **não é
bug** — `OrdemAvulsa` já tem `itens ItemOrdemAvulsa[]`, e
`criarOrdemAvulsa` já agrupa todas as linhas avulsas de uma submissão
numa única chamada `tx.ordemAvulsa.create({ itens: { create: [...] } })`.
O "OP Avulsa #20" repetido é o mesmo número, do mesmo registro pai — o
board só mostra **um card por item**, não por OP, de propósito, espelhando
o mesmo padrão que o fluxo formal já usa (`OrdemProducao` por
`ItemPedido`, não por `Pedido`). Confirmado com o Ryan: manter como
está.

O problema real (confirmado com um cenário reproduzido: duas OPs
avulsas diferentes, clientes diferentes, ambas programadas pro mesmo
dia) era a impressão **não conseguir juntar linhas do mesmo dia vindas
de OPs diferentes** — só dava pra imprimir uma linha por vez ou a folha
inteira. Resolvido:

- **`FolhaProducao` trocou de seleção única pra seleção múltipla**:
  clicar numa linha agora adiciona/remove ela de um `Set` (não
  substitui uma seleção anterior). Cabeçalho mostra a data programada
  quando todas as linhas selecionadas (ou, sem seleção, todas as
  linhas pendentes) compartilham a mesma data; senão cai pro "Impresso
  em hoje", igual antes.
- **Atalho "Selecionar dia DD/MM"**: um botão por data distinta
  presente na folha, que marca de uma vez todas as linhas daquele dia
  — independente de quantas OPs/clientes diferentes elas vieram —,
  exatamente o caso de uso que faltava. "Limpar seleção" some com tudo.
- Total de peças exibido passa a refletir a seleção quando há uma.

## Atualização 2026-08-15 (parte 9) — Editar também no lado formal

O botão "Editar" (parte 7) só existia pro lado avulso. Conferido: o
Pedido formal criado por essa tela **não tinha nenhuma forma de
edição** — `/pedidos/[id]/editar` já existia, mas bloqueia sempre que
algum item já tem `ordemProducao`, e nesse fluxo a `OrdemProducao` é
criada junto com o Pedido, sempre. Reaproveitar aquele editor
diretamente não dava: ele faz `itens: { deleteMany: {}, create: [...] }`
(substitui todos os itens do pedido de uma vez), e como
`OrdemProducao` tem `onDelete: Cascade` a partir de `ItemPedido`, isso
apagaria a(s) `OrdemProducao` existente(s) sem recriar nenhuma — o
card sumiria do board de Produção depois de "editar".

Resolvido com uma tela dedicada, espelhando exatamente o padrão já
usado na avulsa:

- **`atualizarOrdemProducao`** (`producao/actions.ts`) edita só a
  linha (`ItemPedido`) daquela `OrdemProducao` — produto (por id, nome
  exato, ou auto-cadastro a partir do texto, igual à avulsa),
  quantidade, preço, custo e data programada — sem tocar nas outras
  linhas do mesmo Pedido nem recriar a `OrdemProducao`. Recalcula
  `Pedido.valorTotal` somando essa linha com o preço novo + as demais
  linhas do pedido com o valor que já tinham.
- **Mesma trava**: só permitido com a OP em "Aguardando".
- **`EditarItemPedidoForm`** e rota `/producao/formal/[id]/editar` —
  igual ao formulário avulso, exceto que o campo Cliente vem fixo
  (somente leitura, com nota "pra trocar o cliente, edite o pedido
  inteiro em Pedidos") em vez de editável, já que o cliente é do
  Pedido inteiro, não da linha.
- **Botão "Editar" no card** agora aparece nos dois lados (formal e
  avulso) sempre que a OP está em Aguardando, apontando pra rota
  certa conforme a origem.

## Atualização 2026-08-15 (parte 10) — cards agrupados por OP no board

O Ryan reportou que o board mostrava "um card por item" como se fosse
um bug em relação a uma suposta versão já agrupada. Investigado antes
de mexer em código: não existia em lugar nenhum do sistema um card
agrupado — era um mal-entendido. Perguntei se ele queria reverter a
decisão anterior (parte 6, "manter como está") e criar esse
agrupamento agora; confirmado que sim.

Diferente da decisão anterior (que tratava "1 card por item, espelhando
o padrão do fluxo formal" como correto), esta reverte isso: agora o
board agrupa por OP inteira (`OrdemAvulsa`/`Pedido`) **dentro de cada
coluna**. Como itens da mesma OP podem estar em status diferentes (um
já iniciado, outro ainda aguardando), a mesma OP pode aparecer como
**dois cards, um em cada coluna** — cada um só com os itens daquele
status. Isso evita ter que inventar um "status geral da OP" e mantém a
semântica das colunas (uma coluna = um status) intacta.

- **Card agrupado**: número da OP + badge "avulsa" (se for o caso) +
  nome do(s) cliente(s) (junta os nomes com "·" se a OP tiver clientes
  diferentes — só acontece se linhas de clientes diferentes foram
  criadas na mesma submissão do formulário) + resumo "N itens · N
  peças". Dentro, uma linha por item com seus próprios botões de
  status (Iniciar produção/Concluir/Voltar) e, na avulsa,
  Pago/Pendente — continuam por item de propósito, porque produtos
  diferentes da mesma OP podem progredir em ritmos diferentes.
- **Ações no nível da OP** (rodapé do card, não mais por item): Gerar
  recibo, Editar (só em Aguardando) e Cancelar OP.
- **Recibo consolidado**: `ReciboLinha` deixou de receber um produto
  só (`produtoNome`/`quantidade`/etc.) e passou a receber `itens:
  ItemRecibo[]` — sempre um array, mesmo com 1 item. Novas rotas
  `/producao/recibo/avulsa-grupo/[ordemAvulsaId]` e
  `/producao/recibo/formal-grupo/[pedidoId]` mostram todos os itens da
  OP inteira num recibo só, com um canhoto único no final, em vez de
  precisar imprimir um papel por produto. As rotas antigas de recibo
  por item continuam existindo (`recibo/avulsa/[id]`,
  `recibo/formal/[id]`), só não ficaram mais linkadas do card.
- **Edição em lote**: `EditarGrupoAvulsaForm`/`EditarGrupoPedidoForm`
  (rotas `/producao/avulsa/grupo/[ordemAvulsaId]/editar` e
  `/producao/formal/grupo/[pedidoId]/editar`) editam de uma vez só
  todas as linhas da OP que estão em "Aguardando" — mesmos campos do
  editor de item único, sem opção de adicionar/remover linha. As
  actions (`atualizarGrupoAvulsa`, `atualizarGrupoOrdemProducao`)
  reaproveitam a mesma lógica de resolução de produto do editor
  individual (extraída pra uma função `resolverProdutoAvulso`/
  `resolverProdutoFormal` compartilhada, depois de repetir esse bloco
  pela terceira vez). Pulam silenciosamente qualquer linha que não
  esteja mais em "Aguardando" (pode ter mudado de status entre abrir o
  formulário e salvar) em vez de travar o resto.
  **Cuidado de implementação**: os campos usam `itemId` (não `id`)
  pra identificar a linha, porque `useFieldArray` do react-hook-form
  já injeta um `id` interno próprio em cada linha do array — nomear o
  campo real de "id" faria colidir e perder o valor.
- **Cancelamento em lote**: `cancelarGrupoAvulsa`/
  `cancelarGrupoOrdemProducao` recebem uma lista de ids e chamam a
  action de cancelar individual pra cada um (que já trava sozinha se
  algum item tiver expedição gerada) — sem transação nova, só laço.

Testado localmente: OP avulsa com 3 linhas pro mesmo cliente vira 1
card "3 itens · 23 peças"; editar em lote e depois iniciar produção
de 1 item divide certinho em dois cards (2 itens numa coluna, 1 na
outra); cancelar OP no card restante apaga só aqueles itens, sem
mexer no que já tinha mudado de coluna; mesmo fluxo testado também no
lado formal (Pedido com 2 itens pro mesmo cliente cadastrado).

## Atualização 2026-08-15 (parte 11) — pago/pendente também no formal

O controle de pago/pendente (parte 5) só existia pro lado avulso, por
decisão explícita do Ryan na época. Depois de ver "Editar" já estendido
pros dois lados (parte 9), pediu o mesmo pro pago/pendente. Mesmo
padrão de sempre:

- **Campo `pago Boolean @default(false)` em `ItemPedido`** (migration
  `20260815201602_adiciona_pago_item_pedido`), espelhando
  `ItemOrdemAvulsa.pago` — mesmo racional: independente do status
  Em carteira/Faturado do Pedido (que é sobre faturamento, não sobre o
  dinheiro ter entrado).
- **`alternarPagamentoPedido`** (`producao/actions.ts`) recebe o id da
  `OrdemProducao` (mesma convenção de todas as outras ações do card
  formal) e resolve o `ItemPedido` por trás pra atualizar.
- Botão "Pago"/"Pendente" no card não é mais exclusivo da avulsa —
  aparece em qualquer item, dos dois lados.

## Atualização 2026-08-15 (parte 12) — folha impressa agrupada por OP

A tabela de seleção/impressão (`FolhaProducao`) alternava cor por
**cliente**, mas listava as linhas soltas — uma OP com itens de dois
clientes diferentes não tinha nenhuma indicação visual de que aquelas
linhas eram a mesma unidade de produção. Corrigido:

- **`LinhaFolha` ganhou `opGrupoId`/`opNumeroLabel`** (o mesmo
  `grupoOpId`/`numeroLabel` que o board já usa pra agrupar cards —
  parte 10). O campo antigo `Cartao.grupo` (agrupava por cliente, só
  usado pra alternar cor na folha) foi removido — não fazia mais
  sentido depois dessa mudança, e nada mais lia ele.
- **Tabela agora tem uma linha de cabeçalho por OP** ("OP Avulsa #24 ·
  2 itens · 13 peças"), clicável — clicar nela seleciona/desmarca de
  uma vez todas as linhas daquela OP (mesmo toggle usado pro board:
  se já estava tudo selecionado, desmarca tudo; senão, marca tudo).
  Clicar numa linha individual dentro do grupo continua funcionando
  igual antes (`stopPropagation` pra não disparar o clique do
  cabeçalho junto).
- **"Selecionar dia X" continua funcionando**, agora dentro da
  estrutura agrupada — selecionar um dia marca as linhas de todas as
  OPs daquele dia, cada uma ainda com seu próprio cabeçalho visível
  (testado: dia com 2 OPs diferentes marcou as duas, cada uma
  destacada, com o total certo).
- Cor alternada (peach/teal) trocou de "por cliente" pra "por OP",
  consistente com o resto da mudança.

## Consequências

- Duas sequências de numeração de OP coexistem ("OP #7" formal, "OP
  Avulsa #3" avulsa) — visualmente distinguíveis, nunca se confundem
  porque o rótulo já diz qual é qual.
- `/expedicao` agora trata `pedido` como opcional e usa
  `itemOrdemAvulsa` como origem alternativa — telas que assumiam
  `expedicao.pedido` sempre existir foram ajustadas.

## Atualização 2026-08-15 (parte 13) — navegação Mês → Dia → OP do dia vira a tela principal

O Kanban (Aguardando/Em produção/Concluído) era a única forma de ver a
produção. Pedro pediu uma entrada por calendário — mês → dia → OP do
dia — com ações por linha (Recibo, Expedição) direto na tela do dia, e
que essa navegação virasse a rota principal de `/producao`, com o
Kanban preservado mas movido pra dentro dela.

- **`src/lib/producaoCartoes.ts` (novo)** — extrai a busca+mapeamento
  de `Cartao[]` (que antes vivia só dentro do `page.tsx` do board) pra
  um módulo compartilhado. Motivo direto: as 4 telas novas (mês, dias
  do mês, OP do dia, Kanban) precisam do mesmo formato de dado. De
  quebra, corrigiu um bug real: `temExpedicao` dos cards formais
  estava hardcoded em `false` (o include do Prisma não trazia
  `pedido.expedicao`) — agora traz, e o alerta de "concluída esperando
  expedição" fica correto pros dois lados (formal e avulsa).
- **Cada cartão ganhou `diaChave`** — `dataProgramada` (quando
  setada) ou, na falta dela, `createdAt` convertido pro fuso de São
  Paulo (`Intl.DateTimeFormat("en-CA", {timeZone: "America/Sao_Paulo"})`,
  que já devolve `"YYYY-MM-DD"`). Garante que todo item sempre cai em
  exatamente um dia na navegação nova, mesmo os criados sem data
  programada explícita.
- **Kanban movido pra `/producao/kanban`**, conteúdo/lógica interna
  intocados (nenhum botão, drag-and-drop — que não existe em lugar
  nenhum do código, todas as transições de status são botão/form — ou
  fluxo removido). Só ganhou um botão novo "Ver por mês" voltando pra
  `/producao`, e o `PageHeader` virou "Produção · Quadro".
- **`/producao` (nível 1, mês)** — barra de ação (Ver fila / Criar OP
  / Imprimir), alerta branco só para OPs **concluídas sem expedição**
  (sem variante vermelha/atrasada — Pedro não trabalha com esse
  conceito no dia a dia), card escuro "Hoje" com resumo do dia e atalho
  direto pra `/producao/{ano}/{mes}/{dia}` de hoje (pula a navegação
  por mês/dia), e grade dos 12 meses do ano com contagem de OPs/peças
  (`?ano=` pra navegar entre anos).
- **`/producao/[ano]/[mes]` (nível 2, dias)** — lista os dias do mês
  que têm OP, cada um com resumo (OPs/clientes/peças), linkando pro
  dia.
- **`/producao/[ano]/[mes]/[dia]` (nível 3, OP do dia)** — cabeçalho
  do grupo de OP ganha fundo amarelo (`#FBF2D3`) + badge "✓ Concluída"
  (`#F7E5B8`/`#8A6A16`) quando todos os itens da OP estão concluídos;
  Editar some do cabeçalho quando nenhum item está mais aguardando.
  Tabela de itens ganhou colunas **Recibo** (ícone, rota já existente
  de recibo por item) e **Expedição** (ícone caminhão `#0F6E56` — gera
  expedição daquele item específico; mostra "Já gerada" depois).
- **Expedição por linha reaproveita as actions existentes**
  (`gerarExpedicao`/`gerarExpedicaoAvulsa`), sem mudança de schema —
  ambas já criam um registro `Expedicao` novo via FK opcional+única
  (`pedidoId`/`itemOrdemAvulsaId`), sem tocar no registro original de
  Produção. Nuance: do lado formal, expedição é por **Pedido inteiro**
  (não por linha) — `gerarExpedicao` foi chamado com o `grupoOpId` do
  cartão, que é o `pedidoId`; do lado avulsa é por item mesmo.
- **Separação tela/impressão é real, no DOM, não só CSS de esconder
  coluna**: a tela do dia tem dois blocos JSX distintos —
  `print:hidden` (tudo interativo: Recibo/Expedição/Editar/Cancelar/
  badge) e `hidden print:block` (só Quant./Produto/Cliente/Observação/
  Feito, agrupado por OP, igual a folha antiga). Testado com
  `page.emulateMedia({media: "print"})`: nenhum elemento interativo
  aparece no modo impressão, e a folha impressa continua idêntica à
  de antes.
- Formulários de criar/editar OP (avulsa e formal) tiveram o redirect
  de sucesso e o botão Cancelar trocados de `/producao` pra
  `/producao/kanban`, já que `/producao` deixou de ser uma tela de
  ações e virou a entrada por mês.

## Atualização 2026-08-15 (parte 14) — agenda semanal substitui o Kanban como visão panorâmica

Pedro pensa a produção por dia, não por status — a agenda semanal
(faixa de 6 colunas, segunda a sábado) virou a visão panorâmica
principal, no lugar do Kanban, acessível a partir de `/producao`
("Ver semana", que substituiu o antigo botão "Ver quadro (Kanban)"
naquela tela).

- **`/producao/semana` (novo)** — 6 colunas (segunda a sábado, sem
  domingo), navegação `?inicio=YYYY-MM-DD` (segunda-feira da semana
  exibida; datas fora de segunda são normalizadas pro início da
  semana correspondente). Cada coluna: dia da semana + data, bolinha
  cinza (`#E4DFD4`) ou amarela (`#D6A537` — mesmo critério do alerta
  do nível 1: concluída sem expedição naquele dia), total de
  peças/clientes ou "Nada ainda" com opacidade reduzida se vazio, e
  destaque copper (`border-brand`, borda dupla) no dia de hoje.
  Clicar em qualquer coluna abre `/producao/{ano}/{mes}/{dia}`
  (mesma tela "OP do dia" já existente), com ou sem OP.
- **Estado vazio da tela "OP do dia" ganhou ação** — antes só
  mostrava texto ("Nenhuma OP programada"); agora tem um botão
  "Criar OP para este dia" que leva pra `/producao/nova?data=YYYY-MM-DD`
  com a data já pré-preenchida no formulário (`OrdemAvulsaForm` ganhou
  a prop `dataProgramadaInicial`, usada como `defaultValues.dataProgramada`
  do react-hook-form).
- **Kanban deixou de ter um botão de destaque na tela de mês** — o
  Pedro pediu explicitamente que ele parasse de aparecer como "visão
  principal ou secundária", já que a agenda semanal cobre essa
  necessidade. Continua 100% funcional e acessível direto por
  `/producao/kanban` e pelo botão "Ver no quadro" já existente na tela
  "OP do dia" (nível 3) — nada foi removido do Kanban em si, só o link
  de destaque no nível 1.
