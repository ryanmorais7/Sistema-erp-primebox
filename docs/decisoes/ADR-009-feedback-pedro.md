# ADR-009: Ajustes a partir do feedback do Pedro (uso real do pedido)

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

Pedro (usuário que lança pedidos no dia a dia) descreveu por áudio como
imagina o fluxo de lançamento e quais relatórios precisa. Ryan repassou
esse feedback antes de avançar para a Fase 2 (Produção), pedindo para
fechar essas lacunas primeiro — são refinamentos do MVP já existente,
não escopo novo.

## Decisão

### Preço do item agora é editável por pedido

Antes, o preço unitário do item vinha sempre do cadastro do produto,
travado no servidor (ver ADR-006). Pedro descreveu digitar "o valor de
cada item" — confirmado com Ryan que o vendedor precisa poder negociar
o preço por pedido (ex: desconto para um lojista específico).

- `ItemPedido.precoUnitario` agora vem do formulário, não mais do
  `Produto.preco`. O campo aparece pré-preenchido com o preço cadastrado
  ao selecionar o produto (usando `setValue` do React Hook Form), mas o
  vendedor pode alterar antes de salvar.
- `valorTotal` continua **sempre recalculado no servidor** a partir dos
  preços e quantidades enviados — não confiamos em um total vindo do
  cliente, só no preço unitário por item (que agora é intencionalmente
  editável, diferente de antes).
- Extraída validação/formatação de preço (que já existia em
  `produto.ts`) para `src/lib/validations/moeda.ts`, reaproveitada por
  `Produto` e `ItemPedido`.

### Autocomplete de cliente (Combobox)

Trocado o `Select` (lista fixa) por um `Combobox` — componente do
shadcn/Base UI já disponível no projeto, sem dependência nova — no
campo de cliente do formulário de pedido. Agora dá para digitar parte
do nome (ex: "Alecrim") e o sistema filtra a lista em tempo real, como
Pedro descreveu.

### Campo de observações

`Pedido.observacoes` (texto livre, opcional) para anotações de
pagamento — forma de pagamento, se vai gerar boleto, vencimento, se já
compensou. Só anotação manual nesta fase; emissão real de boleto fica
para uma fase futura (Financeiro). Aparece no formulário e na tela de
visualização do pedido, mas **não aparece na versão impressa** (é
informação interna, não para o cliente).

### Relatórios (novas telas, sem mudança estrutural no banco)

- `/relatorios/clientes`: busca cliente por nome, mostra todos os
  pedidos dele com total agrupado por ano e por mês. Cobre também o
  pedido de "histórico por cliente" — em vez de duplicar essa
  informação dentro da tela de editar cliente, colocamos um atalho
  "Ver pedidos" na listagem de Clientes que leva direto para esse
  relatório já filtrado.
- `/relatorios/faturamento`: escolhe uma data, mostra tudo que foi
  faturado naquele dia, por cliente, com total do dia. Usa
  `Pedido.updatedAt` como data de faturamento — não precisamos de um
  campo novo porque, pela regra de negócio já existente, um pedido
  faturado nunca mais é editado, então `updatedAt` no momento da
  transição para `FATURADO` é confiável. Limites do dia calculados em
  `-03:00` fixo (horário do Brasil, sem horário de verão desde 2019),
  não no UTC do servidor.
- Novo grupo "Relatórios" na sidebar, entre "Comercial" e "Fábrica".

## Consequências

- A mudança de preço editável é uma inversão deliberada da postura de
  "nunca confiar no cliente" do ADR-006 — agora o preço unitário É
  informação de negócio legítima vinda do formulário; o que continua
  travado no servidor é o cálculo do total a partir desses preços.
- Ao editar um pedido existente, o preço mostrado é o que foi
  efetivamente praticado naquele pedido (snapshot), não o preço atual
  do cadastro — mantém a integridade histórica mesmo com preço editável.
- `updatedAt` do Pedido passa a ter um significado de negócio implícito
  (data de faturamento, quando `status = FATURADO`) — se essa regra de
  imutabilidade pós-faturamento mudar no futuro, o relatório de
  faturamento por dia precisa ser revisto.
