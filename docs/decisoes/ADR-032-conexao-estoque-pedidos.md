# ADR-032: Conexão Estoque + Pedidos e ícones de movimentação

- **Status:** Aceito
- **Data:** 2026-08-14

## Contexto

Até aqui, o único caminho pra resolver um item de pedido era gerar uma
Ordem de Produção — mesmo quando o produto já tinha saldo suficiente
em estoque pronto pra entregar direto, sem precisar fabricar de novo.
Também não existia atalho pra criar um pedido a partir da tela de
Estoque quando o vendedor já sabe que tem saldo disponível. Por fim, o
ícone de setas cruzadas (⇄) usado tanto pra Entrada quanto Saída de
estoque não deixava claro qual ação cada botão fazia.

## Decisão

### Novo campo `ItemPedido.atendidoEstoque`

Adicionado `atendidoEstoque Boolean @default(false)` em `ItemPedido`
pra representar "resolvido direto do estoque, sem produção" — um
caminho de resolução paralelo e mutuamente exclusivo a `OrdemProducao`
(1:1 opcional). Não reaproveitamos `OrdemProducao` com um status
especial porque isso misturaria "produzido" com "já estava pronto",
distorcendo o board de Produção.

### Atender item do pedido direto do estoque

Em cada item do pedido, mostra o saldo atual daquele produto
específico (`calcularSaldosProdutos()`, já existente em
`src/lib/estoque.ts`) e, se o saldo cobre a quantidade pedida
integralmente, o botão **"Atender do estoque"** aparece ao lado de
"Gerar OP" (`atenderItemDoEstoque` em
`src/app/(app)/estoque/actions.ts`). Ao confirmar: desconta o saldo
via um `MovimentoEstoqueProduto` do tipo SAIDA com observação
automática (`Referente ao pedido #N`) e marca `atendidoEstoque = true`
numa transação. Sem atendimento parcial — se o saldo cobre só parte da
quantidade, trata como insuficiente (só "Gerar OP" aparece).

### Criar pedido a partir do Estoque

Nova rota `/estoque/criar-pedido/[id]`, acessível só quando o produto
tem saldo > 0 (botão "Criar pedido"; com saldo zerado, mostra "Sem
saldo" desabilitado). Formulário simplificado — cliente, quantidade
(limitada ao saldo) e preço unitário pré-preenchido com o preço de
venda cadastrado — cria o Pedido já com o item `atendidoEstoque: true`
e a saída de estoque, na mesma lógica do item acima
(`criarPedidoDoEstoque`).

### Ícones de Entrada/Saída

Substituído o ícone único de setas cruzadas por dois ícones
lado a lado com legenda (`PackagePlus`/"Entrada" em teal,
`PackageMinus`/"Saída" em copper — mapeamento mais próximo disponível
no Lucide pros ícones Tabler `ti-package-import`/`ti-package-export`
pedidos), cada um linkando pro mesmo formulário de "Registrar
movimentação" já existente, só pré-selecionando o campo Tipo via
query string (`?tipo=ENTRADA|SAIDA`) — poupa um clique. Aplicado tanto
em Produtos prontos quanto em Matéria-prima, já que os dois usavam o
mesmo ícone ambíguo.

Ícones sem equivalente exato no Lucide (`ti-shopping-cart-plus`,
`ti-shopping-cart-off`) foram trocados por `ShoppingCart` e `PackageX`
respectivamente — mais próximos disponíveis na biblioteca já usada no
projeto.

## Consequências

- Badge "Produção" na listagem de Pedidos (`/pedidos`) agora conta
  itens com `ordemProducao` OU `atendidoEstoque` como resolvidos —
  senão um pedido 100% atendido do estoque apareceria erradamente como
  "0/N OP" pendente.
- Testado fim a fim localmente: atender item do estoque desconta o
  saldo certo e marca o item; criar pedido do estoque cria o pedido já
  atendido e desconta o saldo; os dois links de Entrada/Saída
  pré-selecionam o tipo certo no formulário.
- Tabela de itens do pedido ficou mais larga (saldo do produto + até 2
  botões de ação); em telas mais estreitas precisa de scroll horizontal
  dentro da tabela — mesmo comportamento já existente pra outras
  tabelas densas do sistema, não é regressão nova.
