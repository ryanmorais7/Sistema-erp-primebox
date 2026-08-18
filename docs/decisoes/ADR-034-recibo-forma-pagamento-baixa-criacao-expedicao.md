# ADR-034: Recibo com forma de pagamento, baixa de insumo na criação da OP, remoção da Expedição do menu

- **Status:** Aceito
- **Data:** 2026-08-18

## Contexto

Ryan mandou um prompt único com 5 blocos de pedidos (Bloco 0 a 4),
priorizando o Bloco 0 (recibo/forma de pagamento) explicitamente.
Cobre: campo de forma de pagamento em Pedido, ajuste de layout do
recibo, simplificação da tela "OP do dia", mudança de quando a baixa
de insumo acontece, remoção da Expedição do menu, padronização de
botões em Pedidos/Produtos, e busca por cliente com autocomplete.

## Decisão

### Bloco 0 — Forma de pagamento e recibo

- **`Pedido.formaPagamento String?`** (novo campo) — texto livre, nunca
  obrigatório, com sugestões rápidas (Pix/Cartão de Crédito/Boleto/
  Cheque) que preenchem o campo mas continuam editável depois
  (`FormaPagamentoField`, componente novo). Só existe em Pedido — não
  em Produção/OP avulsa, decisão fechada no próprio prompt.
- **`ReciboLinha` (componente compartilhado por Pedidos e Produção)**
  ganhou um bloco "FORMA DE PAGAMENTO" (logo depois de Cliente, antes
  da tabela de itens), só aparece se preenchido. Como o campo não
  existe do lado avulso, esse bloco nunca aparece nos recibos de OP
  avulsa — comportamento correto por omissão, não precisa de lógica
  condicional extra por origem.
- **Canhoto fixo no rodapé**: `ReciboLinha` passou a envolver o
  conteúdo principal + canhoto num container `flex flex-col
  min-h-[297mm]` (tamanho de uma folha A4); o conteúdo cresce
  (`flex-1`) e o canhoto fica fora dessa área com `mt-auto`, empurrado
  pro fim. Sem `position: fixed/absolute` (quebraria a impressão) — é
  fluxo normal, então em pedidos com muitos itens o canhoto simplesmente
  aparece no fim do documento (uma vez só), sem forçar 2 páginas.
- **`/pedidos/[id]` parou de ter uma implementação própria (duplicada)
  do recibo com canhoto** — agora a área interativa (tabela completa
  com Custo/Margem/ações, Rentabilidade, Observações internas) só
  aparece em tela (`print:hidden`), e a impressão usa `<ReciboLinha>`
  igual às páginas de recibo de Produção (`hidden print:block`). Isso
  também removeu, de graça, o bloco "Expedição" que vivia ali (ver
  Bloco 1B abaixo).

### Bloco 1A — Tabela "OP do dia" simplificada

- Colunas finais: Qtd. / Produto / Cliente / Observação / Preço unit. /
  Subtotal. Removidas: Feito (toggle por item, sem substituto — só
  "Marcar como concluída" no cabeçalho da OP continua existindo),
  Recibo (por item) e Expedição (por item).
- **Botão "Recibo" novo no cabeçalho de cada OP** (ao lado de Editar/
  Cancelar OP), linkando pro recibo agrupado
  (`/producao/recibo/formal-grupo/[id]` ou `avulsa-grupo/[id]`) — sem
  isso, recibo ficaria inacessível a partir da tela principal de
  Produção, contradizendo a prioridade do Bloco 0. Não estava escrito
  no prompt, mas é consequência direta de "não deixar recibo
  inacessível" + "remover coluna Recibo".
- "Editar" perdeu o ícone de lápis, ficou só texto (mesmo padrão do
  Bloco 2/3 abaixo).

### Bloco 1B — Expedição sai do menu e das rotas

- Removidos: item "Expedição" da sidebar, `/expedicao` (página +
  actions), `/pedidos/[id]/expedicao/nova`, coluna/ação "Gerar
  expedição" na tabela "OP do dia", bloco "Expedição" em
  `/pedidos/[id]`, alerta "N OPs concluídas · esperando expedição" em
  `/producao` (não fazia mais sentido sem a etapa).
- **Trava de "expedição já gerada" removida do lado avulso**
  (`voltarProducaoAvulsa`, `cancelarItemOrdemAvulsa`) — sem UI pra
  gerenciar Expedição, uma trava presa a ela deixaria linhas antigas
  permanentemente impossíveis de cancelar/voltar, sem explicação
  visível pro usuário.
- **Modelo `Expedicao` e a relação em `Pedido`/`ItemOrdemAvulsa` foram
  mantidos no schema** (não veio pedido explícito pra apagar a
  tabela, só "tirar do menu, rota incluída") — dado histórico de
  quem já usou a feature continua no banco, só inacessível pela UI.
  Se um dia for pra apagar de vez, é uma decisão nova (destrutiva,
  precisa de migration de DROP TABLE).

### Bloco 1C — Cards de mês com altura fixa

`Passo 1 · Escolher o mês`: cada card ganhou `h-32` fixo +
`justify-center`, em vez de altura dependente de ter ou não a linha
"N OP" embaixo do nome do mês.

### Bloco 1D — Baixa automática de insumo na criação, não na conclusão

Ficha técnica (`ConsumoMateriaPrima`) e estoque mínimo
(`MateriaPrima.estoqueMinimo`) **já existiam** (ver ADR-011/ADR-016) —
não foi criada tabela nova. O que mudou foi **quando** a baixa
acontece.

- **`src/lib/estoque.ts` foi dividido em 4 funções** (antes eram 2,
  cada uma fazendo as duas coisas juntas):
  - `darBaixaInsumos` / `estornarInsumos` — matéria-prima, agora
    chamadas na **criação** da OP (formal ou avulsa), uma única vez.
  - `darEntradaProdutoAcabado` / `estornarEntradaProdutoAcabado` —
    produto acabado, continuam na **conclusão**, sem baixa de insumo
    junto (isso já aconteceu na criação).
- **3 pontos de criação de OP cobertos**: `gerarOrdemProducao`
  (formal, um item por vez, botão em `/pedidos/[id]`),
  `criarOrdemAvulsa` (a tela "Criar OP", cobre formal em lote +
  avulsa), `confirmarImportacaoProducao` (planilha, formal + avulsa).
- **Cancelar sempre estorna o insumo**, em qualquer status
  (Aguardando/Em produção/Concluído) — antes só estornava se já tinha
  concluído; agora o insumo sempre foi baixado (na criação), então
  sempre precisa voltar. Estorno de produto acabado continua só se já
  tinha concluído.
- **Editar produto/quantidade de uma linha ainda "Aguardando"**
  (`atualizarOrdemProducao`/`atualizarGrupoOrdemProducao` no lado
  formal, `atualizarItemOrdemAvulsa`/`atualizarGrupoAvulsa` no avulso)
  agora **refaz a baixa**: estorna pelo produto/quantidade antigos e
  baixa de novo pelos novos, se algum dos dois mudou. Sem isso, editar
  uma OP ainda aguardando deixaria o estoque de matéria-prima
  desalinhado com o que a OP realmente vai consumir — esse é um caso
  que só passou a existir com a baixa acontecendo na criação (antes,
  baixa só rolava na conclusão, quando editar já estava bloqueado).
- **Produto sem ficha técnica**: `darBaixaInsumos` retorna
  `{ avisos: [] }` sem criar nenhum movimento — cria a OP normal,
  nunca trava.
- **Aviso não bloqueante** (`avisosEstoque: string[]`, retornado pelas
  3 ações de criação): mostrado inline na tela de criação — banner
  amarelo (`#FDF0D2`/`#F0B429`) na tela de sucesso da OrdemAvulsaForm
  (`/producao/nova`) e da importação de planilha
  (`/producao/importar`). O botão único (`gerarOrdemProducao`, sem
  tela própria de criação) não tem aviso inline — conta só com o
  indicador persistente abaixo.
- **Indicador persistente em `/producao`**: contador
  ("N insumos abaixo do mínimo"), sempre visível quando `N > 0`,
  clicável pra `/estoque`, sem botão de fechar — só some quando o
  saldo voltar pra cima do mínimo (`listarInsumosAbaixoDoMinimo`,
  novo em `estoque.ts`).

### Bloco 2 e 3 — Padronização de botões em Pedidos e Produtos

- Pedidos (`/pedidos`): "Editar" virou texto (sem ícone de lápis);
  "Faturar" virou botão sólido copper (`#C9622B`) com texto, em vez de
  ícone isolado — destaque visual proposital, é a ação mais importante
  da linha.
- Produtos (`/produtos`): removido o ícone de "ficha técnica" da
  listagem (funcionalidade continua em `/produtos/[id]/ficha-tecnica`,
  só sem atalho ali) e o ícone de X; "Editar" virou texto; o badge de
  Status (Ativo/Inativo) virou o próprio gatilho de
  `alternarAtivoProduto` — um `<button>` envolvendo o `Badge`, sem
  modal de confirmação (reaproveita a action que já existia).

### Bloco 4 — Busca por cliente com autocomplete e sem acento

- **`src/lib/texto.ts` (`normalizarBusca`)** — minúsculo + remove
  marcas diacríticas (NFD, filtra os codepoints da faixa "combining
  marks" numericamente, em vez de escrever o intervalo Unicode como
  regex/string literal no arquivo-fonte, pra não arriscar problema de
  encoding). A busca em `/relatorios/clientes` trocou de `contains` do
  Prisma (não ignora acento) para filtro em JS com essa função — a
  lista de clientes já é pequena o bastante pra filtrar toda em
  memória, e essa mesma lista alimenta o autocomplete.
- **`BuscaClienteInput`** (client component novo) — dropdown de
  sugestões enquanto digita, clicar navega direto pra
  `?clienteId=...` (pula a tela intermediária de resultados).
  Continua funcionando como formulário GET normal (botão "Buscar")
  pra quem preferir digitar e confirmar.
- Mensagem "Nenhum cliente encontrado com esse nome." substitui o
  texto anterior (que citava o termo buscado).

## Atualização 2026-08-18 — 3 reclamações do Pedro depois do primeiro uso

Pedro testou o recibo/OP do dia recém publicados e trouxe 3
reclamações. Uma já estava resolvida pelo Bloco 0 desta mesma ADR
(confirmado testando, não só lendo o código); as outras duas eram
bugs reais.

- **"Um produto de um cliente se mistura com o outro" ao imprimir uma
  OP em Produção — era bug de verdade.** Causa raiz:
  `buscarCartoesProducao()` devolve os cartões ordenados só por
  `createdAt`, sem agrupar por cliente. Tanto `/producao/imprimir`
  (folha geral, todos os dias pendentes) quanto a "Versão B" (folha do
  dia, impressa) da tela "OP do dia" listavam as linhas nessa ordem
  crua — a cor alternada (`coresAlternadasPorCliente`) muda a cada
  troca de cliente na lista, então sem agrupamento ela deixa de separar
  visualmente qualquer coisa (dois clientes intercalados viram 4+
  blocos de cor picotados, não 2). **Fix:** ambas as páginas agora
  ordenam por `dataProgramada` (ou "sem data" por último) e, dentro do
  mesmo dia, por `clienteLabel` — antes de calcular as cores e montar
  as linhas. Efeito colateral bom: os cards da Versão A (interativa) da
  OP do dia também saem agrupados por cliente, não pela ordem de
  criação.
- **Status (Em carteira/Faturado) aparecendo no canhoto do Pedido —
  já estava resolvido.** O canhoto do Pedido usa `ReciboLinha`
  (Bloco 0 desta ADR), que nunca renderizou status; o bloco antigo que
  mostrava o badge de status é o card interativo, já `print:hidden` por
  completo. Testado com `emulateMedia("print")` + screenshot pra
  confirmar de verdade (não só ler o código) — o badge realmente não
  aparece impresso. Pedro provavelmente testou antes do deploy ou com
  cache de página antiga.
- **Barra cinza aparecendo (e "expandir a tela")** — a barra é a
  rolagem horizontal espelhada do componente `Table`
  (`src/components/ui/table.tsx`, pensada pra tabelas longas como
  Clientes), que aparecia porque a tabela de itens do Pedido tinha 9
  colunas e não cabia no container. **Fix:** removidas as colunas
  "Medida" e "Tecido/Cor" da tabela interativa de `/pedidos/[id]` e do
  bloco de itens do `ReciboLinha` (afeta os 5 lugares que usam o
  componente — Pedidos e os 4 recibos de Produção) — like Pedro
  apontou, o campo Produto já aceita texto livre, então essa
  informação normalmente já está no nome digitado. `ItemRecibo` perdeu
  os campos `medidaNome`/`tecidoCor` do tipo. Container principal do
  app (`(app)/layout.tsx`) alargado de `max-w-5xl` pra `max-w-7xl`
  ("expandir a tela") — sem as duas colunas, a tabela já cabe
  confortavelmente, e a barra não aparece mais (confirmado com
  screenshot).

## Atualização 2026-08-18 (parte 2) — recibo: tabela de verdade e reconfirmação do status

Ao trocar pra 4 colunas (Produto/Qtd./Preço unit./Subtotal), a lista de
itens do `ReciboLinha` tinha ficado como uma sequência de `<div>`s em
flex-wrap ("Produto" / "Quantidade" em blocos separados, sem cabeçalho
nem alinhamento de coluna) — visualmente parecia texto solto, não uma
tabela. Trocado por uma `<table>` HTML de verdade (thead com as 4
colunas, Qtd. centralizado, Preço unit./Subtotal à direita, Produto à
esquerda; tfoot com a linha "Total" quando tem mais de um item).
Deliberadamente uma `<table>` simples, não o componente `Table`
compartilhado (`src/components/ui/table.tsx`) — esse tem a rolagem
espelhada do topo (a mesma "barra cinza" da atualização anterior), que
não faz sentido reintroduzir numa tabela de recibo com só 4 colunas
fixas.

Sobre a etiqueta de status "aparecer de novo": conferido de novo o
`ReciboLinha` e as 5 páginas que o chamam — nenhuma jamais passou
status pro componente. Testado com screenshot em `emulateMedia print`
pra dois pedidos, um "Faturado" e um "Em carteira" — nenhum dos dois
mostra qualquer etiqueta no cabeçalho. Não houve regressão aqui; a
reclamação provavelmente veio de um teste antes do deploy anterior
propagar ou de cache de página antiga.

## Atualização 2026-08-18 (parte 3) — OP do dia: moldura única por dia, e some o "Avulsa" do rótulo

Ryan comparou dois dias: um com uma OP avulsa antiga (3 clientes
diferentes numa mesma `OrdemAvulsa`, moldura única) e outro com 5 OPs
avulsas recentes (uma por cliente — regra atual, "uma OP avulsa só
pode ter um cliente", ver ADR-033), cada uma na sua própria caixa com
borda e espaçamento. Perguntei se ele queria unificar só visualmente
ou de verdade mesclar os registros no banco (apagando a separação por
cliente); confirmou: só visual.

- **Versão A (interativa) da tela "OP do dia"** — o `<div
  className="flex flex-col gap-4">` com uma caixa (`rounded-lg
  border`) por grupo virou um `<div className="divide-y rounded-lg
  border">` só, com cada grupo ocupando uma seção interna (`p-4`,
  sem borda própria) separada por linha divisória. Cada OP continua
  sendo um registro independente por baixo — botões de "Marcar como
  concluída"/"Recibo"/"Editar"/"Cancelar OP" continuam por grupo, só a
  moldura visual foi unificada. Fundo creme sutil (`#FBF7F0`) alternado
  a cada seção (índice ímpar), pra ajudar a distinguir onde uma OP
  termina e a próxima começa sem precisar de borda.
- **Removido "Avulsa" de todo rótulo gerado automaticamente** — "OP
  Avulsa #N" virou "OP #N" em: `Cartao.numeroLabel`
  (`producaoCartoes.ts`, fonte de tudo que usa o rótulo — OP do dia,
  Kanban), Painel ("Pedidos e OPs recentes"), Faturamento por período,
  os 2 recibos avulsos (`titulo`/`numeroLabel`), e os 2 títulos de
  página "Editar OP". **Não mexido**: o texto `clienteTexto` que o
  Pedro digita (ex: "Avulso" como nome de cliente quando não tem
  cliente real) — só o rótulo automático da OP perdia a palavra, nunca
  o que foi digitado por ele. Também não mexido: os `rotulo` internos
  passados pro histórico de movimento de estoque
  (`observacao` de `MovimentoEstoqueMateriaPrima`/`Produto`) — são
  auditoria técnica, não a tela que o Pedro olha.

## Atualização 2026-08-18 (parte 4) — revertido: OP avulsa volta a aceitar vários clientes numa OP só

A "moldura única" da parte 3 melhorou a aparência, mas não resolveu o
incômodo de verdade: perguntei se Ryan queria só unificar visualmente
ou juntar os registros de vez, e a resposta foi mais fundamental do
que as duas opções que dei — **ele nunca quis a regra "uma OP avulsa
por cliente"**. Confirmado explicitamente: "em uma OP só pode conter
diversos clientes".

- **Revertido o agrupamento por cliente** em `criarOrdemAvulsa`
  (`producao/ordem-avulsa/actions.ts`) e `confirmarImportacaoProducao`
  (`producao/importar/actions.ts`) — as duas tinham uma regra
  documentada ("uma OP avulsa só pode ter um cliente, mesma regra do
  lado formal") que agrupava as linhas avulsas de uma submissão por
  `clienteTexto` normalizado, criando uma `OrdemAvulsa` por cliente
  distinto. Voltou a ser **uma `OrdemAvulsa` só por submissão**,
  não importa quantos clientes diferentes tenham linhas nela — era
  literalmente o comportamento original de antes dessa regra (o
  comentário antigo no código até documentava isso ao explicar a
  mudança, "antes todas as linhas avulsas de uma submissão caíam numa
  OrdemAvulsa só").
- A tela de resumo "OPs criadas com sucesso" (import de planilha) — o
  `clienteNome` de uma OP avulsa agora é a lista dos clientes distintos
  daquela submissão, separados por "·", já que não é mais garantido
  ter só um.
- **A "moldura única" da parte 3 continua valendo** — ela ainda importa
  pro caso de várias submissões separadas caírem no mesmo dia (cada
  `criarOrdemAvulsa` chamado em momentos diferentes ainda gera uma
  `OrdemAvulsa` própria); só deixou de ser a explicação de por que o
  dia 18 parecia "errado" — a causa raiz era o agrupamento por cliente
  dentro da mesma submissão, não a apresentação visual.
- **Dados já existentes (ex: as OPs já separadas do dia 18) não foram
  tocados nesta parte** — mesclar registros já criados exigiria uma
  migração direta no banco de produção (reparentar itens entre
  `OrdemAvulsa`s e apagar as vazias), uma ação bem mais arriscada que
  um deploy de código normal. Perguntado ao Ryan separadamente antes
  de fazer.

## Consequências

- `docs/requisitos/requisitos-fase5.md` precisa refletir que Expedição
  saiu da UI (feature revertida, não nova).
- `docs/requisitos/requisitos-fase3.md` precisa refletir que a baixa
  de insumo não acontece mais "ao concluir a OP", e sim na criação.
- Testado ponta a ponta (Playwright + verificação direta no banco):
  criação com ficha técnica baixa o insumo uma vez; cancelar estorna;
  concluir não baixa de novo; aviso aparece com o saldo real; recibo
  mostra forma de pagamento só quando preenchida; canhoto fica no
  rodapé mesmo com 1 item só (folga visível antes da linha de corte).
