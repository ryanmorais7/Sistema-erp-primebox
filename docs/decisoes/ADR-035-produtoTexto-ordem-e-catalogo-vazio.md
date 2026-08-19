# ADR-035: texto do produto sempre literal, ordem de digitação preservada, catálogo esvaziado

- **Status:** Aceito
- **Data:** 2026-08-19

## Contexto

Ryan reportou um bug crítico na criação de OP: (1) a ordem em que os
itens são digitados no formulário não é a ordem em que aparecem na OP
salva; (2) quando o texto digitado bate com um produto já cadastrado, a
tela passa a mostrar o nome salvo no cadastro (ex.: "Base Bau 088 linho
mel pux emb", minúsculo, com prefixo) em vez do texto exatamente como
foi digitado (ex.: "BAU 088 LINHO MEL PUX EMB"); (3) pediu pra esvaziar
o catálogo de Produtos imediatamente pra eliminar esse conflito; (4)
pediu pra remover o prefixo "Base"/tipo que aparece automaticamente
antes do nome em algumas telas.

## Investigação (causa raiz)

**Ordem (item 1)** — duas causas independentes, ambas corrigidas:

- **Causa deliberada e dominante:** `/producao/[ano]/[mes]/[dia]` e
  `/producao/imprimir` reordenavam os cartões alfabeticamente por
  `clienteLabel` (fix de propósito de uma sessão anterior, pra parar de
  misturar cor de cliente diferente na folha impressa). Sempre que uma
  submissão intercalava clientes, a ordem digitada desaparecia.
- **Causa estrutural:** não existia nenhum campo de posição em
  `ItemPedido`/`ItemOrdemAvulsa`. A ordem de exibição dependia de (a)
  `pedido.itens`/`ordemAvulsa.itens` devolvido por um `include` do
  Prisma logo após um `create` aninhado — sem `orderBy`, essa ordem não
  é garantida — e (b) `createdAt`, que em Postgres é o horário de
  início da *transação*, não de cada `INSERT` — todos os itens de uma
  mesma submissão (mesma `$transaction`) nascem com o `createdAt`
  idêntico, então o `ORDER BY createdAt` empata e o desempate final
  fica por conta da ordem física devolvida pelo banco, não da ordem
  digitada.

**Sobrescrita de nome (item 2)** — raiz estrutural: `ItemPedido` e
`ItemOrdemAvulsa` só guardavam `produtoId` (vínculo com o cadastro),
nunca o texto digitado. Quando o texto batia (case-insensitive) com um
`Produto.nome` já existente, o resolver (`resolverProdutoFormal`,
`resolverProdutoAvulso`) reaproveitava o id do produto existente e
descartava o texto digitado por completo. Toda exibição (`textoProduto()`
em `producaoCartoes.ts`) sempre reconstruía o rótulo a partir de
`Produto.nome` — nunca havia onde recuperar o texto original. Somado a
isso, `ProdutoTextoField`/`ClienteTextoField` já sobrescreviam o texto
visível no próprio campo, no cliente, assim que o usuário saía do campo
(`onBlur`) e o texto batia com um cadastro existente — o bug já
começava antes mesmo de salvar.

**Catálogo (item 3)** — excluir de verdade não é seguro: nenhuma
relação que aponta pra `Produto` (`ItemPedido`, `ItemOrdemAvulsa`,
`ConsumoMateriaPrima`, `MovimentoEstoqueProduto`) tem
`onDelete: Cascade` — de propósito, documentado desde o ADR-029, pra
nunca apagar histórico de pedido/produção/estoque sem pedido explícito.
Um `DELETE` em massa travaria (violação de FK) em qualquer produto com
histórico, que é a maioria depois de meses de uso. Não existe nem ação
`excluirProduto` no código hoje. A única forma seguro e já suficiente é
inativar em massa (`ativo: false`) — todo formulário que lista produtos
pra escolher (Pedido, OP formal/avulsa, edição) já filtra
`where: { ativo: true }`, então isso já bloqueia qualquer sugestão sem
precisar de nenhuma mudança de código adicional.

**Prefixo "Base" (item 4)** — só existia em `textoProduto()`
(`producaoCartoes.ts`), usada em exatamente 2 pontos (card de OP formal
e avulsa), que alimentam 4 telas (`OP do dia`, `imprimir`, `kanban` —
desativado). Os 4 recibos e a tela de Pedido nunca usaram essa função,
liam `produto.nome` puro. Puramente cosmético, nada fazia parse do
resultado.

## Decisão

### Schema — `produtoTexto` e `ordem` em `ItemPedido` e `ItemOrdemAvulsa`

Duas colunas novas nos dois modelos (migration
`20260819190431_adiciona_produto_texto_e_ordem`):

- **`produtoTexto String`** — o texto exatamente como foi digitado
  (mesma caixa, mesma acentuação). É a **única** fonte usada pra
  exibir o produto, em qualquer tela — tela, impressão, recibo,
  formulário de edição. `produtoId` continua existindo e sendo
  resolvido (vincula a um produto existente por nome, ou cadastra um
  novo silenciosamente) só pro uso interno de estoque/ficha técnica —
  nunca mais influencia o que é mostrado.
- **`ordem Int`** — posição da linha na ordem em que foi digitada.
  Populada com o índice da linha na submissão (0, 1, 2...); ao
  adicionar itens depois numa OP avulsa já aberta (ver o merge de OP
  do mesmo dia, ADR-034 parte 5), continua a partir do maior `ordem`
  já usado no grupo, nunca reseta pra 0 — então itens novos sempre
  entram no final.
- **Backfill dos registros existentes:** `produtoTexto` recebeu o
  `Produto.nome` vinculado (não tem como recuperar o texto original,
  nunca foi salvo); `ordem` recebeu a posição relativa atual (por
  `createdAt`+`id` em `ItemOrdemAvulsa`, só por `id` em `ItemPedido`,
  que não tem `createdAt`) — não é a ordem de digitação original
  (perdida), só evita que tudo empate em 0.

### Ordem de exibição

- `producaoCartoes.ts`: `Cartao.produtoTexto` agora vem direto de
  `item.produtoTexto`/`ordem.itemPedido.produtoTexto` — a função
  `textoProduto()` (que montava o prefixo + nome + tecido/cor) foi
  removida por completo, junto com os `include: { produto: ... }` que
  só existiam pra alimentá-la. O sort final ganhou `ordem` como
  desempate: `createdAt` (uma OP criada em momento diferente de outra)
  `|| ordem` (linhas da mesma transação, mesmo `createdAt`).
- **Removida a reordenação alfabética por cliente** em
  `/producao/[ano]/[mes]/[dia]` e `/producao/imprimir` — confirmado
  com o Ryan que ordem de digitação vale mais que a faixa de cor ficar
  "picotada" quando clientes vêm intercalados (aceita esse trade-off
  visual de volta, é o preço de nunca reordenar). Em `/producao/imprimir`
  o agrupamento por **data programada** continua (não é o mesmo tipo de
  ordenação que o pedido veta — é agrupar por dia num relatório que
  junta vários dias, não reordenar dentro do mesmo dia); só o desempate
  dentro do mesmo dia deixou de ser por cliente e passou a ser
  `createdAt || ordem`.
- **Corrigido o "include desordenado"**: em `criarOrdemAvulsa`
  (`ordem-avulsa/actions.ts`) e `confirmarImportacaoProducao`
  (`producao/importar/actions.ts`), depois de criar o Pedido com
  `itens: { create: [...] }` e reler via `include: { itens: true }`,
  os itens agora são reordenados por `.ordem` antes do loop que cria
  cada `OrdemProducao` — senão o número da OP saía fora da ordem
  digitada mesmo com `produtoTexto`/`ordem` corretos no banco.

### Campo Produto/Cliente livres

- **`ProdutoTextoField`** foi reduzido a um `<Input>` simples — sem
  sugestão/autocomplete puxando do catálogo, sem sobrescrever o texto
  no `onBlur`, sem o popup de "cadastrar produto novo" embutido (o
  servidor já resolve/cadastra sozinho ao salvar, então o popup ficou
  redundante). Os 6 formulários que usavam esse campo (`PedidoForm`,
  `OrdemAvulsaForm`, os 4 de edição) pararam de passar `produtoId`/
  `produtos`/`medidas` pra ele — o preenchimento automático de
  preço/custo ao bater com um produto do catálogo também saiu (não faz
  mais sentido sem correspondência automática).
- **`ClienteTextoField`** manteve a sugestão por clique (Cliente
  continua sendo um vínculo real, necessário pro faturamento formal) —
  só o `onBlur` que sobrescrevia o texto digitado com o nome cadastrado
  ao sair do campo foi removido. Selecionar uma sugestão continua
  preenchendo o texto normalmente — é ação explícita do usuário, não
  "correspondência automática".
- **`pedidos/[id]/editar`**: a lógica que buscava produtos inativos só
  pra alimentar o autocomplete de um item já existente (`produtosFaltantes`/
  `produtoNomePorId`) foi removida — ficou redundante, o texto editável
  vem direto de `item.produtoTexto`.

### Catálogo de Produtos esvaziado

Rodado um script (`ativo: false` em massa) direto contra o Postgres de
produção e o de teste (ambientes com base separada, ver conversa
anterior) — 54 produtos em produção, 20 em teste (incluindo os
"Exemplo Produto" do seed, que o próprio seed nunca reativa: só cria se
não existir, nunca faz `update` de `ativo`). Reversível — `/produtos`
continua listando os inativos com badge "Inativo" e o toggle de
reativar.

### Prefixo "Base"/tipo removido

Consequência direta de trocar a fonte de exibição pra `produtoTexto`
verbatim — como `textoProduto()` foi removida, nenhuma tela volta a
concatenar tipo/medida antes do nome. Os recibos e a tela de Pedido já
nunca tiveram esse prefixo (usavam `produto.nome` puro), só passaram a
usar `produtoTexto` no lugar de `produto.nome` pelo mesmo motivo do
item anterior (preservar o texto digitado), não por causa do prefixo.

## O que NÃO mudou

- `resolverProdutoFormal`/`resolverProdutoAvulso` continuam existindo e
  funcionando exatamente como antes — ainda vinculam por nome exato
  quando bate, ainda cadastram um produto novo quando não bate. É
  vínculo interno (estoque, ficha técnica), nunca mais fonte de
  exibição.
- Nenhum Pedido, OP ou histórico foi apagado — só a listagem de
  Produtos ativos ficou vazia.
- `/produtos` continua funcional pra cadastro futuro, sem nenhuma
  mudança de comportamento na tela em si.

## Consequências

- Preço/custo não preenchem mais sozinhos ao digitar um nome que bate
  com o catálogo, em nenhum dos 6 formulários — o usuário digita
  manualmente, sempre. Aceito como consequência necessária de remover a
  correspondência automática.
- `docs/requisitos/requisitos-fase2.md` e `requisitos-mvp.md`
  precisam refletir que o campo Produto é texto livre sem autocomplete
  e que Produtos foi esvaziado.
- Testado localmente: `tsc`/`eslint` limpos; script funcional criando
  OP avulsa com 6 itens em ordem/caixa variada confirmando ordem e
  texto exatos, prefixo ausente, e item adicionado depois entrando no
  final sem reordenar; mesmo teste pro lado formal (Pedido → OP),
  confirmando que o número da OP segue a ordem digitada; conferido
  visualmente no navegador que o campo Produto não mostra mais sugestão
  nem o badge "Vinculado ao catálogo".
