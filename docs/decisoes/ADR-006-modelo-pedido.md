# ADR-006: Modelo de dados de Pedido

- **Status:** Aceito
- **Data:** 2026-07-31

## Contexto

Item 3 do MVP: pedido = cliente + itens (produto + quantidade) + valor
total + status (em carteira / faturado). Modelo discutido e confirmado
com Ryan antes da implementação.

## Decisão

```prisma
enum StatusPedido {
  EM_CARTEIRA
  FATURADO
}

model Pedido {
  id         String       @id @default(cuid())
  numero     Int          @unique @default(autoincrement())
  clienteId  String
  cliente    Cliente      @relation(fields: [clienteId], references: [id])
  status     StatusPedido @default(EM_CARTEIRA)
  valorTotal Decimal      @db.Decimal(10, 2)
  itens      ItemPedido[]
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
}

model ItemPedido {
  id            String  @id @default(cuid())
  pedidoId      String
  pedido        Pedido  @relation(fields: [pedidoId], references: [id], onDelete: Cascade)
  produtoId     String
  produto       Produto @relation(fields: [produtoId], references: [id])
  quantidade    Int
  precoUnitario Decimal @db.Decimal(10, 2)
}
```

- **`numero` (Int autoincrement, separado do `id` cuid)**: identificador
  sequencial legível para uso humano ("Pedido #1042"), necessário para a
  impressão de pedido (item 4 do escopo).
- **`status` como enum fixo** (`EM_CARTEIRA` / `FATURADO`): os dois
  únicos estados do requisito. Sem status de cancelamento — cancelar um
  pedido em carteira é apagá-lo; um pedido faturado não pode mais ser
  excluído nem editado (ver regras de negócio abaixo).
- **`precoUnitario` gravado em cada `ItemPedido`** (snapshot do preço do
  produto no momento do pedido), e **`valorTotal` gravado no `Pedido`**
  (soma dos itens): protege o histórico — se o preço de um produto mudar
  depois, pedidos já criados mantêm o valor praticado na época.
  `valorTotal` é sempre recalculado no servidor a partir dos itens
  enviados, nunca aceito diretamente do cliente (evita manipulação).
- **`onDelete: Cascade`** em `ItemPedido.pedido`: apagar um pedido apaga
  seus itens junto.

### Regras de negócio confirmadas com Ryan

- Pedido faturado não pode mais ser editado nem excluído (a tela de
  edição vira uma visualização somente leitura quando `status =
  FATURADO`).
- Quantidade é sempre um número inteiro positivo.
- Não é permitido repetir o mesmo produto duas vezes no mesmo pedido
  (validação no formulário).

## Consequências

- `Cliente` ganhou a relação `pedidos Pedido[]` e `Produto` ganhou
  `itensPedido ItemPedido[]`, que tinham ficado de fora no ADR-002
  porque `Pedido` ainda não existia.
- A tela de edição de pedido (`/pedidos/[id]/editar`) precisa buscar
  clientes/produtos ativos para os seletores, mas também incluir o
  cliente/produtos já usados no pedido mesmo que tenham sido
  desativados depois — senão a edição quebraria a integridade do que já
  foi selecionado.
- Ainda não existe uma tela de impressão/visualização formatada do
  pedido — isso é o item 4 do escopo, a ser feito na sequência.

## Atualização 2026-08-17 — pedido faturado agora pode ser editado

Ryan pediu para habilitar "Editar" em qualquer status (carteira ou
faturado) — a trava original ("pedido faturado não pode mais ser
editado", linha 61 acima) não era mais o comportamento desejado.

- **Removida a trava por `status = FATURADO`** em `atualizarPedido`,
  no redirect de `/pedidos/[id]/editar` e no botão "Editar" da
  listagem (3 pontos, ver ADR-009 pro campo novo que isso exigiu).
- **Trava por OP continua existindo, agora independente do status**:
  se algum item já tem `OrdemProducao` vinculada, "Editar" some e a
  rota redireciona de volta — editar recria os itens do zero
  (`deleteMany` + `create`), o que apagaria a OP em cascata (ver
  ADR-010). Essa trava nunca foi sobre o status faturado, é sobre ter
  OP gerada.
- **Excluir continua bloqueado em pedido faturado** — não foi pedido
  para mudar, só "Editar" foi mencionado. *(Atualizado no dia
  seguinte — ver abaixo.)*

## Atualização 2026-08-18 — Excluir também liberado em Faturados, e produto por texto livre

Dois pedidos do Ryan no mesmo dia:

- **Excluir agora funciona em qualquer status**, igual ao Editar do dia
  anterior — a frase "Excluir continua bloqueado em pedido faturado"
  logo acima não vale mais. Mesma trava única: só bloqueia se algum
  item já tem `OrdemProducao` (`excluirPedido`, `pedidos/actions.ts`).
- **Campo Produto do formulário de Pedido deixou de ser um `<Select>`
  fechado** (só produtos já cadastrados) **e virou texto livre com
  autocomplete**, reaproveitando o `ProdutoTextoField` que já existia
  pro fluxo de Produção/OP avulsa (ver ADR-033): digita, escolhe uma
  sugestão, ou cadastra um produto novo sem sair do formulário.
  - `itemPedidoSchema` ganhou `produtoTexto` (obrigatório) e
    `produtoId` virou opcional — mesmo padrão do
    `editarItemPedidoSchema` que já existia pro card de Produção.
  - **`resolverProdutoFormal`** (antes vivia só dentro de
    `producao/actions.ts`) foi extraído pra `src/lib/resolverProdutoFormal.ts`
    e passou a ser usado também por `montarItensComPreco`
    (`pedidos/actions.ts`): resolve por id, por nome exato já
    cadastrado, ou cadastra um produto novo a partir do texto —
    funciona mesmo se o vendedor digitar e não clicar em nada (rede de
    segurança no servidor, não só no popup do cliente).
  - `ProdutoTextoField`/`criarProdutoRapido` ganharam `custo` no tipo
    `Produto` (antes só tinham `preco`, suficiente pro lado avulso que
    não rastreia custo) — Pedido precisa dos dois pra pré-preencher
    "Custo unit." ao selecionar/cadastrar um produto.
