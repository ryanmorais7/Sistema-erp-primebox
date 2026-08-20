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
