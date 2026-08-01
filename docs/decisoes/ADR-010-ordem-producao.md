# ADR-010: Ordem de Produção (Fase 2)

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

Primeira funcionalidade da Fase 2 do roadmap (fora do MVP original).
Três decisões de modelagem foram confirmadas com Ryan antes da
implementação.

## Decisão

```prisma
enum StatusOrdemProducao {
  AGUARDANDO
  EM_PRODUCAO
  CONCLUIDO
}

model OrdemProducao {
  id           String              @id @default(cuid())
  numero       Int                 @unique @default(autoincrement())
  itemPedidoId String              @unique
  itemPedido   ItemPedido          @relation(fields: [itemPedidoId], references: [id], onDelete: Cascade)
  status       StatusOrdemProducao @default(AGUARDANDO)
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
}
```

- **Uma OP por item do pedido, não por pedido inteiro**
  (`itemPedidoId @unique`, relação 1:1): um pedido com base + colchão
  gera duas ordens de produção independentes, que podem terminar em
  momentos diferentes. Consistente com o mockup de referência.
- **Criação manual** ("Gerar OP"): o pedido fica em carteira
  normalmente; alguém da fábrica decide quando mandar um item para
  produção, pela tela do pedido (`/pedidos/[id]`).
- **Faturamento e produção são independentes**: não há trava entre o
  status do `Pedido` (`EM_CARTEIRA`/`FATURADO`) e o status da
  `OrdemProducao`. Um pedido pode ser faturado com produção ainda em
  andamento, ou vice-versa — quem decide a ordem na prática é a fábrica.
- **Quadro simples com botões, não drag-and-drop**: o mockup de
  referência mostrava um quadro Kanban arrastável. Optamos por botões
  de ação ("Iniciar produção", "Concluir") em vez de arrastar-e-soltar,
  para não adicionar uma biblioteca de drag-and-drop nesta fase — mesmo
  resultado funcional, menos complexidade.

### Trava de integridade: pedido com item em produção não pode ser editado nem excluído

A edição de pedido (`atualizarPedido`) recria todos os itens do zero
(`deleteMany` + `create`) — se algum item já tem uma `OrdemProducao`
vinculada, editar o pedido apagaria essa OP junto (a relação é
`onDelete: Cascade` a partir do item). Para evitar isso, `atualizarPedido`
e `excluirPedido` agora verificam se algum item do pedido tem OP
associada e bloqueiam a ação nesse caso — mesmo tratamento que já
existia para pedido faturado. A tela de edição (`/pedidos/[id]/editar`)
redireciona para a visualização quando isso acontece.

## Consequências

- Sidebar: "Produção" sai do grupo "em breve" e vira link ativo,
  apontando para `/producao` (quadro Aguardando/Em Produção/Concluído).
  "Estoque" continua desabilitado (ainda é Fase 3).
- Se no futuro for necessário permitir editar quantidade de um item que
  já está em produção, será preciso repensar o `atualizarPedido` para
  atualizar itens existentes em vez de recriar todos — não implementado
  agora porque não foi pedido.
