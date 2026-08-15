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

## Consequências

- Duas sequências de numeração de OP coexistem ("OP #7" formal, "OP
  Avulsa #3" avulsa) — visualmente distinguíveis, nunca se confundem
  porque o rótulo já diz qual é qual.
- `/expedicao` agora trata `pedido` como opcional e usa
  `itemOrdemAvulsa` como origem alternativa — telas que assumiam
  `expedicao.pedido` sempre existir foram ajustadas.
