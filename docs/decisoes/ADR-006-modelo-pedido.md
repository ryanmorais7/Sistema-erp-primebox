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
