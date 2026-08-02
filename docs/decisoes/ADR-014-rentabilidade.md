# ADR-014: Rentabilidade (custo x preço) do Produto e do Pedido

- **Status:** Aceito
- **Data:** 2026-08-02

## Contexto

Ryan repassou um novo pedido de Pedro: importante ter, no sistema, a
rentabilidade do produto e do pedido — o custo de produção comparado
ao preço de venda. Login/acessos ficam para quando o sistema for
entregue; enquanto isso Ryan pediu para seguir com outras
funcionalidades, e esta é a próxima. É um refinamento sobre os
cadastros já existentes (Produto e Pedido), não uma fase nova do
roadmap original.

## Decisão

### `Produto.custo` e `ItemPedido.custoUnitario`

Espelham exatamente o padrão já usado para preço:

- `Produto.custo` (`Decimal(10,2)`, `@default(0)`): custo de produção
  cadastrado no produto, editável a qualquer momento.
- `ItemPedido.custoUnitario` (`Decimal(10,2)`, `@default(0)`): snapshot
  do custo no momento do pedido, pré-preenchido a partir de
  `Produto.custo` ao selecionar o produto, mas **editável pelo
  vendedor** — o custo real de um lote pode variar (matéria-prima mais
  cara num mês, por exemplo), igual ao `precoUnitario` já é editável
  desde o ADR-009.
- `valorTotal` do pedido continua calculado só a partir de
  `precoUnitario` — custo nunca entra nessa conta, é informação
  paralela para medir margem, não para cobrar o cliente.

### `custoSchema` diferente de `precoSchema`

O preço de venda nunca deveria ser zero (`precoSchema` já exige
`> 0`). O custo, porém, pode legitimamente ser zero — um produto recém
cadastrado ainda sem custo apurado, por exemplo. Criar um schema
`custoSchema` próprio (aceita `>= 0`) em `src/lib/validations/moeda.ts`
evita que produtos existentes (que migram com `custo = 0`) quebrem a
criação de pedidos por causa de uma validação pensada para preço.

### Onde a margem aparece

- **Cadastro de Produto**: campo "Custo de produção" ao lado de "Preço
  de venda", com margem estimada (R$ e %) calculada ao vivo no
  formulário. Coluna "Margem" na listagem de produtos.
- **Formulário de Pedido**: campo "Custo unit." por item (pré-
  preenchido, editável), coluna "Margem" por item, e "Margem estimada"
  total somada ao "Total" já existente.
- **Visualização do Pedido**: colunas "Custo unit." e "Margem" na
  tabela de itens, e um card "Rentabilidade" com custo total, receita
  total e margem (R$ e %).
- Todas essas colunas/cards usam `print:hidden` — a exemplo das
  observações internas (ADR-009), rentabilidade é informação de uso
  interno da PrimeBox e **nunca aparece na versão impressa** que vai
  para o lojista.

## Consequências

- Mesma lógica de snapshot editável do ADR-009 se estende ao custo:
  editar um pedido antigo mostra o custo praticado naquele pedido, não
  o custo atual do cadastro do produto.
- Produtos cadastrados antes desta mudança ficam com `custo = 0`
  (default da migração) até serem editados manualmente — a margem
  exibida para eles será 100% até que o custo real seja preenchido;
  não há preenchimento automático retroativo.
- Se no futuro custo de produção passar a ser calculado a partir de
  matéria-prima consumida na Ordem de Produção (ver ADR-011, estoque
  de matéria-prima), este campo manual pode ser revisto — por ora é
  entrada manual, mais simples e suficiente para o pedido de Pedro.
