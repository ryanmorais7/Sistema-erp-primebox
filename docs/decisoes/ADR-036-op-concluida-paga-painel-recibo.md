# ADR-036: OP concluída conta como paga, Pedido "Pago", Painel recalculado e recibo mais denso

- **Status:** Aceito
- **Data:** 2026-08-20

## Contexto

Ryan pediu 5 mudanças urgentes: (1) OP avulsa concluída passa a contar
como paga nos relatórios/Painel, sem botão separado de pagar; (2) o
botão "Faturar" em Pedidos vira "Marcar como pago", status "Pago" em
teal; (3) os 4 cards do Painel são renomeados e recalculados somando
Pedido + OP; (4) a lista "Pedidos e OPs recentes" ganha popover de
clientes múltiplos, link no número, status real da OP (sem mais o
badge fixo "Avulsa"); (5) o recibo ganha negrito nos totais e cabe até
15 itens numa folha só com o canhoto visível.

Duas perguntas de negócio foram levantadas antes de implementar, com
risco real de contar receita errada ou de pedir algo estruturalmente
impossível — respondidas pelo Ryan antes de qualquer mudança:

## Decisão

### 1. OP formal NÃO conta separado — só a OP avulsa

Uma OP formal (a que vem de um `Pedido`) já tem seu valor coberto pelo
próprio status do Pedido (`EM_CARTEIRA`/`FATURADO`, agora rotulado
"Em carteira"/"Pago"). Se a conclusão da OP formal *também* contasse
como paga independente do status do Pedido, um Pedido com OP concluída
mas ainda "Em carteira" (ninguém clicou "Marcar como pago") somaria a
mesma receita de duas formas diferentes no Painel.

**Decisão confirmada com o Ryan:** a regra "OP Concluída = paga" vale
só pra OP avulsa (sem Pedido por trás) — que já tinha uma versão
parcial dessa regra implementada (ver ADR-033, "concluir a OP avulsa já
conta como ganho no Painel"). OP formal continua dependendo
exclusivamente do status do Pedido, sem nenhuma mudança de
comportamento nessa parte.

### 2. OP cancelada continua sendo apagada, "Cancelada" nunca aparece de fato

Cancelar uma OP (formal ou avulsa) já apaga a linha do banco de
propósito (ver `cancelarOrdemProducao`/`cancelarItemOrdemAvulsa`,
decisão de sessão anterior — sem isso o botão "Gerar OP" não voltaria
a aparecer como se a OP nunca tivesse existido). `StatusOrdemProducao`
nunca teve um valor `CANCELADO`. Uma linha apagada não pode aparecer em
nenhuma lista, então "status Cancelada" é estruturalmente impossível de
exibir hoje, não importa quanto código de exibição seja escrito.

**Decisão confirmada com o Ryan:** mantém o cancelar = apagar como já
funciona. A lista de recentes mostra Aguardando/Em produção/Concluída
normalmente; "Cancelada" nunca aparece na prática, mas isso não é um
bug novo — é consequência direta de uma decisão já tomada antes, não
desta mudança.

### 3. Cálculo dos 4 cards do Painel

Com a decisão 1 acima, "OP" nas fórmulas abaixo significa sempre OP
avulsa (`ItemOrdemAvulsa`), nunca OP formal:

| Card (rótulo novo) | Fórmula |
|---|---|
| "Em carteira" | Pedidos `EM_CARTEIRA` + `ItemOrdemAvulsa` `AGUARDANDO` com valor > 0 |
| "Pedidos Pagos" | Pedidos `FATURADO` + `ItemOrdemAvulsa` `CONCLUIDO` com valor > 0 |
| "Clientes ativos" | Sem mudança — clientes distintos com Pedido criado no mês |
| "Valor pendente" | Soma de Pedidos `EM_CARTEIRA` + `ItemOrdemAvulsa` `AGUARDANDO` (valor > 0) |

Item avulso sem preço (ou preço zerado) **não entra em soma nem em
contagem** em nenhum dos dois cards — antes, um item CONCLUIDO sem
preço ainda incrementava a contagem de "pedidos" mesmo somando R$ 0 na
receita; agora é pulado por completo (`valorOuZero` + `continue` em
`src/app/(app)/page.tsx`). Item `EM_PRODUCAO` não entra em nenhum dos
dois cards (nem "Em carteira" nem "Pagos") — segue a literalidade do
pedido ("OPs Aguardando"/"OPs Concluída", sem mencionar Em produção).

Pedido nunca tem valor zero (`precoUnitario` é validado como > 0 no
formulário), então não precisou de filtro extra do lado do Pedido.

Layout/ícone/cor/posição dos 4 cards não mudou — só rótulo e a conta
por trás. O gráfico "Faturamento" e o card de detalhe abaixo dos
cards também tiveram a palavra "Faturado" trocada por "Pago" pra não
ficar inconsistente com os cards logo acima (não foi pedido
explicitamente, mas deixaria a tela com dois vocabulários diferentes
pra mesma coisa).

### 4. Lista "Pedidos e OPs recentes"

- **Cliente com múltiplos nomes**: `LinhaRecente` trocou `clienteLabel:
  string` por `clientePrincipal: string` + `clientesExtras: string[]`.
  Quando `clientesExtras` tem algum nome, a célula renderiza
  `&lt;ClientePopover&gt;` (novo componente,
  `src/components/painel/cliente-popover.tsx`) — nome principal + "+ N
  clientes" clicável, abrindo um popover com os demais. Novo primitivo
  `src/components/ui/popover.tsx` (`@base-ui/react/popover`, mesmo
  padrão do `dropdown-menu.tsx` já existente). O trigger e o conteúdo
  do popover param a propagação do clique (`stopPropagation`) pra não
  brigar com o clique na linha inteira (`LinhaPedidoRecente`, que
  navega pro registro completo — é o que cobre "número é link").
- **Status real da OP avulsa**: badge fixo `"Avulsa"` removido. Nova
  função `statusOrdemAvulsa()` deriva o status a partir dos itens da
  `OrdemAvulsa` — o "pior" status manda (algum item `AGUARDANDO` →
  "Aguardando"; senão algum `EM_PRODUCAO` → "Em produção"; senão
  "Concluída", só quando todos os itens já concluíram). "Concluída" usa
  a cor positiva padrão (`bg-positive-soft text-positive`), igual ao
  Pedido "Pago" — as outras duas ficam sem cor especial (mesmo
  tratamento neutro que "Em carteira" já tinha).

### 5. Recibo — negrito e mais itens por folha

`src/components/producao/recibo-linha.tsx`:

- Cabeçalho da tabela (Produto/Qtd./Preço unit./Subtotal) e a linha
  `tfoot` "Total" (quando tem mais de 1 item) passaram de `font-medium`
  pra `font-bold`. A régua acima do `tfoot` ficou mais forte
  (`border-t-2 border-foreground/30`, era só `border-t`).
- **Bloco novo "Total dos pedidos"**, fora da tabela, sempre que algum
  item tem preço (`temPreco`) — não existia nada parecido antes (só o
  `tfoot`, que só aparece com mais de 1 item). Linha pontilhada acima
  (mesmo padrão visual do "Cortar aqui" do canhoto), espaçamento maior
  (`mt-8 pt-6`), valor em negrito e fonte maior. Decisão de
  interpretação: como "TOTAL DOS PEDIDOS" não existia no código e o
  pedido descrevia um elemento com linha pontilhada + espaçamento
  próprios (diferente do `tfoot` já existente), foi tratado como um
  bloco novo e distinto, não uma renomeação do `tfoot` — fácil de
  ajustar se a intenção era outra.
- **Densidade variável por quantidade de itens**: `compacto =
  itens.length > 8` reduz o padding das células de `p-3` pra `px-3
  py-1`. Testado com 15 itens (script Playwright, print emulation,
  medindo a altura real do conteúdo contra 277mm em pixels — mesmo
  valor do `print:min-h-[277mm]` já usado no wrapper) — canhoto
  continua no rodapé da mesma página. Sem quantidade de itens
  suficiente pra ativar o modo compacto (≤ 8), nada muda — layout
  idêntico ao de antes.

## Consequências

- `docs/requisitos/requisitos-mvp.md` (Pedido) e
  `docs/requisitos/requisitos-fase2.md` (Produção/Painel) precisam
  registrar o rótulo "Pago" e a fórmula nova dos cards.
- O enum `StatusPedido` continua `EM_CARTEIRA`/`FATURADO` no banco —
  só o rótulo em tela virou "Pago". Não houve migration nem mudança de
  schema nesta ADR.
- Testado localmente: `tsc`/`eslint` limpos; script funcional criando
  OP avulsa concluída com valor e conferindo que soma certo em
  "Pedidos Pagos"/"Valor pendente" e que item sem preço não conta;
  conferido visualmente no navegador o popover de clientes, o status
  real da OP na lista, o botão "Marcar como pago" e a cor do badge
  "Pago"; recibo com 15 itens renderizado e medido em modo impressão
  pra confirmar que cabe numa folha só com o canhoto visível.

## Atualização 2026-08-20 — recibo: fonte nunca diminui, só o espaçamento

Ryan testou o recibo denso (15 itens) e achou a fonte pequena demais
pra ler confortavelmente — a primeira versão desta ADR reduzia fonte
(`text-sm` → `text-xs`, 14px → 12px) **e** padding ao mesmo tempo assim
que passava de 8 itens. Pediu pra inverter a prioridade: nunca diminuir
a fonte da tabela, ajustar primeiro o espaçamento vertical, só cair a
fonte como último recurso (com um piso de ~10px).

- `src/components/producao/recibo-linha.tsx`: a tabela agora fica
  **sempre em `text-sm` (14px)**, tenha 1 ou 15 itens — a condicional
  de fonte foi removida por completo. Só o padding vertical das
  células (`paddingCelula`) continua variando por quantidade de itens.
- **Testado empiricamente, gerando o PDF de verdade** (não só medindo
  a tela) com exatamente 15 itens, subindo o padding gradualmente até
  achar o maior valor que ainda cabe numa página: `py-0.5` → `py-1` →
  `py-1.5` (ainda cabe, 1 página) → `py-2` (estoura pra 2 páginas).
  Ficou em **`py-1.5`** — o maior espaçamento possível com a fonte
  cheia, sem estourar. Não precisou chegar no piso de 10px em nenhum
  momento — `text-sm` (14px) já é suficiente pra 15 itens com esse
  padding.
- Item ≤ 8: nada muda, continua `p-3` (padding original) + `text-sm`,
  exatamente como sempre foi.
- Confirmado de novo com poucos itens (2) que o canhoto continua
  colado no rodapé, sem subir pro meio da folha — o mecanismo (`flex
  flex-col` + `min-h-[277mm]` + `mt-auto` no canhoto) não foi tocado
  nesta atualização, só o padding das linhas da tabela.

## Atualização 2026-08-21 — assinatura, corte e canhoto viram um bloco só de rodapé

Ryan reportou um vão vazio entre a assinatura do representante e o
canhoto, principalmente com poucos itens. Causa raiz: só o wrapper do
canhoto tinha `mt-auto` (empurra ele pro fim da coluna flex); a
assinatura estava dentro do `flex-1` de cima, só com uma margem fixa
(`mt-10`) em relação ao card principal — como `flex-1` não é ele mesmo
um container flex que distribui espaço entre filhos, a assinatura
ficava colada no fim do card principal, e toda a folga vertical
sobrava *entre* a assinatura e o canhoto (que sim ia pro fundo da
página via `mt-auto`), em vez de ficar acima dos dois.

- `src/components/producao/recibo-linha.tsx`: assinatura do
  representante, linha "Cortar aqui" e canhoto agora vivem dentro de
  **um único container** (`&lt;div className="mt-auto
  print:break-inside-avoid"&gt;`), segundo filho direto da coluna flex
  da página (o primeiro é o `flex-1` só com o card principal). Só esse
  container tem `mt-auto` — a assinatura perdeu sua margem própria
  (`mt-10`/`print:mt-6`), a linha de corte perdeu o `my-8` e ganhou
  `mt-5 mb-8` (`print:mt-4 print:mb-4`) — margem fixa, não flex nem
  auto-margin, deliberadamente dentro da faixa pedida (16-24px) só no
  espaço entre a assinatura e a linha de corte.
- **Testado gerando o PDF de verdade** com 1 item e com 15 itens,
  medindo a posição de cada peça: gap entre assinatura e linha de
  corte idêntico nos dois casos (16px), e o fundo do canhoto cai
  exatamente na mesma posição (1046,9px, o limite de 277mm) nos dois —
  o bloco inteiro sobe/desce junto conforme o conteúdo acima, sempre
  com a mesma distância interna. Continua cabendo numa página só com
  15 itens.
- Nada antes da tabela (cabeçalho, Cliente, Forma de pagamento) foi
  tocado — só a estrutura do bloco de rodapé.
