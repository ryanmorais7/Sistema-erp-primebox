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

## Consequências

- Duas sequências de numeração de OP coexistem ("OP #7" formal, "OP
  Avulsa #3" avulsa) — visualmente distinguíveis, nunca se confundem
  porque o rótulo já diz qual é qual.
- `/expedicao` agora trata `pedido` como opcional e usa
  `itemOrdemAvulsa` como origem alternativa — telas que assumiam
  `expedicao.pedido` sempre existir foram ajustadas.
