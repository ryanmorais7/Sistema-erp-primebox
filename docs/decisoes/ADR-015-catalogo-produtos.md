# ADR-015: Correção do catálogo de produtos (Base, Unibox, Baú)

- **Status:** Aceito
- **Data:** 2026-08-02

## Contexto

Ryan conversou com o Pedro sobre o catálogo real da fábrica: a PrimeBox
produz apenas **Base**, **Unibox** (o box e o colchão vendidos e
fabricados como uma peça só) e **Baú** (base com compartimento de
armazenamento) — todos nas medidas padrão (Solteiro, Casal, Queen, King,
Super King). Colchão avulso não é um produto que a fábrica fabrica.

O modelo original (ADR-002) previa `TipoProduto` como `BASE`, `COLCHAO`,
`CONJUNTO_BOX` — planejado antes de confirmar o catálogo real com o
Pedro. Esta ADR corrige isso.

## Decisão

`TipoProduto` passa a ser `BASE`, `UNIBOX`, `BAU`:

- `CONJUNTO_BOX` foi renomeado para `UNIBOX` — mesmo conceito (box e
  colchão juntos), só adotando o termo que a fábrica usa.
- `COLCHAO` deixou de existir como tipo.
- `BAU` é um tipo novo.

### Migration com conversão de dados

Como já existiam produtos cadastrados (de teste) com tipo `COLCHAO`, a
migration (`ajusta_tipos_produto_catalogo`) não podia simplesmente
recriar o enum — precisava preservar os registros existentes. Solução:
criar o novo tipo (`TipoProduto_new`), converter a coluna com um `CASE`
que mapeia tanto `COLCHAO` quanto `CONJUNTO_BOX` para `UNIBOX`, e então
substituir o tipo antigo pelo novo. Postgres não permite remover um
valor de um enum diretamente (`DROP VALUE` não existe), então recriar o
tipo é o padrão correto quando a mudança remove um valor, e não apenas
adiciona.

### Produtos de exemplo (dados fictícios de teste)

Depois da migration, os produtos fictícios que ainda tinham "Colchão"
no nome (ex: "Colchão Molas Ensacadas Premium") foram renomeados para
"Unibox X", preservando os pedidos de exemplo já montados em cima
deles (cobrança atrasada, OP em estágios diferentes, etc. — ver
contexto do seed de exemplos). Dois produtos de exemplo de tipo Baú
foram adicionados, já que esse tipo não tinha nenhum exemplo ainda.

## Consequências

- Nenhum dado foi perdido: produtos de teste que usavam `COLCHAO`
  viraram `UNIBOX` automaticamente pela migration, e depois tiveram só
  o nome ajustado manualmente.
- Se a PrimeBox um dia passar a vender colchão avulso (fora do Unibox),
  isso volta a exigir uma nova ADR e migration — decisão deliberada,
  não wildcard aberto no enum.
