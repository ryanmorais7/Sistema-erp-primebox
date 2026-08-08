# ADR-029: Excluir de verdade Produto, Matéria-prima e Fornecedor

- **Status:** Aceito
- **Data:** 2026-08-08

## Contexto

Até agora, Produto/Matéria-prima/Fornecedor só tinham "desativar"
(soft delete via campo `ativo`) — não dava pra remover um item cadastrado
por engano sem me pedir pra mexer direto no banco. Ryan pediu um botão de
excluir de verdade nessas 3 listas, sem precisar pedir toda vez.

## Decisão

### Exclusão real, mas bloqueada quando há histórico

Nenhuma dessas 3 tabelas tem `onDelete: Cascade` nas relações que
apontam pra elas (`ItemPedido`, `MovimentoEstoqueProduto`,
`ConsumoMateriaPrima`, `MovimentoEstoqueMateriaPrima`,
`PrecoMateriaPrima`) — de propósito, porque cascatear apagaria histórico
de pedidos/movimentações sem ninguém pedir isso. Em vez de deixar o banco
estourar um erro de constraint, cada action nova (`excluirProduto`,
`excluirMateriaPrima`, `excluirFornecedor`) primeiro **confere se existe
algo vinculado**; se existir, devolve uma mensagem explicando o motivo e
sugerindo usar "Desativar" em vez de excluir. Só apaga de verdade quando
não há nenhuma dependência.

### Confirmação antes de excluir

Diferente do padrão que já existia no sistema (nenhum outro botão de
excluir/desativar pedia confirmação — ver `excluirPedido`), esse aqui
pede confirmação (`window.confirm`) antes de disparar a exclusão, porque
agora é uma exclusão de verdade e irreversível, não um soft delete. Criei
um componente reutilizável (`BotaoExcluir`,
`src/components/ui/botao-excluir.tsx`) — client component pequeno, sem
introduzir uma biblioteca de diálogo nova (o projeto não tinha nenhum
`Dialog`/`AlertDialog` ainda). Ele chama a Server Action diretamente
(via `.bind(null, id)`, passada como prop do Server Component pra esse
client component — padrão documentado do Next.js pra Server Actions com
argumento pré-preenchido) e mostra um `alert()` se a exclusão for
bloqueada.

### Onde entrou

- `/produtos` — ao lado do botão de ativar/desativar.
- `/estoque` — na seção de matéria-prima (a seção de produtos acabados
  ali já não tinha botão de editar/desativar, só "registrar
  movimentação" — não mexi nisso, o botão de excluir produto fica só na
  tela `/produtos`).
- `/estoque/fornecedores`.

## Consequências

- Testado com item livre (exclui normalmente) e item com histórico
  vinculado (bloqueia com a mensagem certa) pras 3 entidades, incluindo
  conferir que o diálogo de confirmação aparece antes de qualquer ação.
- Se um item tiver histórico e o usuário realmente precisar removê-lo,
  a única forma continua sendo desativar (ou eu apagar manualmente pelo
  banco, com o mesmo cuidado de sempre).
