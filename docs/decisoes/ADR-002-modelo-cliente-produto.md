# ADR-002: Modelo de dados de Cliente, Produto e Medida

- **Status:** Aceito
- **Data:** 2026-07-30

## Contexto

O MVP precisa de cadastro de Clientes (lojistas, B2B) e Produtos
(bases/colchões: tipo, medida, tecido, cor, preço). O modelo foi
discutido e ajustado com Ryan antes da implementação.

## Decisão

### Cliente

- `cnpj` e `cpf` são campos opcionais e independentes (não um único
  campo "documento"), pois um lojista pode ser pessoa jurídica (CNPJ) ou,
  mais raramente, MEI/pessoa física (CPF). Cada um é único quando
  presente.
- Endereço é embutido diretamente na tabela `Cliente` (não normalizado em
  uma tabela `Endereco` separada), porque no MVP cada cliente tem um único
  endereço de entrega/cobrança. Se no futuro surgir a necessidade de
  múltiplos endereços por cliente, isso deve virar uma nova ADR.
- Campo `ativo` (soft flag) em vez de exclusão física, para não quebrar o
  histórico de pedidos quando o modelo `Pedido` for criado.

### Produto

- `tipo` é um enum (`BASE`, `COLCHAO`, `CONJUNTO_BOX`): valores fixos e
  conhecidos do negócio, faz sentido travar no banco.
- `preco` é `Decimal(10,2)`, nunca `Float`, para evitar erros de
  arredondamento em valores monetários.
- `tecido` e `cor` são opcionais.

### Medida — tabela em vez de enum

Foi cogitado usar um enum do Prisma (`SOLTEIRO | CASAL | QUEEN | KING |
SUPER_KING`) para a medida do produto, mas Ryan pediu um "padrão fixo,
com possibilidade de alterar depois". Um enum exigiria alteração de
código + migration + deploy para adicionar/renomear uma medida.

Optamos por uma tabela `Medida` (lookup), semeada inicialmente com as 5
medidas padrão do mercado (Solteiro, Casal, Queen, King, Super King),
com campo `ordem` para manter a sequência correta nas telas de seleção e
`ativo` para desativar uma medida sem apagar histórico. `Produto`
referencia `Medida` por chave estrangeira (`medidaId`).

Isso permite adicionar/desativar uma medida no futuro sem alterar
código nem rodar uma nova migration — basta um novo registro na tabela.

## Consequências

- Consultas de produto por medida exigem um `join`/`include` com
  `Medida` em vez de comparar um valor de enum diretamente — custo
  aceitável dado o ganho de flexibilidade.
- O seed inicial do banco (`prisma/seed.ts`) precisa popular as 5
  medidas padrão antes que qualquer produto possa ser cadastrado.
- Os modelos `Cliente` e `Produto` já preveem os relacionamentos
  `pedidos` / `itensPedido`, que serão implementados quando o modelo
  `Pedido` for criado (item 3 do escopo do MVP) — ainda não implementado
  nesta etapa.
