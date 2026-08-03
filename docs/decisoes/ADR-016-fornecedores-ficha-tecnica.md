# ADR-016: Fornecedores, comparação de preço e ficha técnica de matéria-prima

- **Status:** Aceito
- **Data:** 2026-08-03

## Contexto

Ryan trouxe um pedido do Pedro sobre a tela de Matéria-prima: esconder
o campo "Mínimo" da listagem, cadastrar fornecedores com o valor que
cada um cobra por unidade de medida (pra comparar quem está mais
barato), e — puxando o fio — descobrir quanto de cada matéria-prima
um produto consome por medida, já que a fábrica hoje só produz Base,
Unibox e Baú (ver ADR-015), todos nas medidas padrão.

## Decisão

### Esconder "Mínimo" da tabela

`estoqueMinimo` continua existindo no banco (é o que decide o badge
"Baixo"/"OK"), só deixou de aparecer como coluna própria na tabela de
matéria-prima em `/estoque`.

### `Fornecedor` e `PrecoMateriaPrima`

```prisma
model Fornecedor {
  id        String   @id @default(cuid())
  nome      String
  ativo     Boolean  @default(true)
  ...
  precos    PrecoMateriaPrima[]
}

model PrecoMateriaPrima {
  id             String       @id @default(cuid())
  materiaPrimaId String
  fornecedorId   String
  valor          Decimal      @db.Decimal(10, 2)
  ...
  @@unique([materiaPrimaId, fornecedorId])
}
```

Uma matéria-prima pode ter **vários fornecedores** cotados, cada um
com seu valor por unidade (a unidade já é a que está cadastrada na
matéria-prima — m, chapa, kit, etc., não duplicamos esse campo). A
tela de editar matéria-prima lista todos os fornecedores cotados e
destaca o mais barato com um selo; a listagem principal de estoque
mostra o melhor preço direto na tabela. Cadastro de fornecedor é
simples (só nome + ativo/inativo), em `/estoque/fornecedores`.

### `ConsumoMateriaPrima` (ficha técnica)

```prisma
model ConsumoMateriaPrima {
  id             String       @id @default(cuid())
  produtoId      String
  materiaPrimaId String
  quantidade     Decimal      @db.Decimal(10, 2)
  ...
  @@unique([produtoId, materiaPrimaId])
}
```

Liga um `Produto` a quanto ele consome de cada `MateriaPrima` por
unidade produzida. Tela própria em `/produtos/[id]/ficha-tecnica`
(link a partir da listagem de produtos), com adicionar/editar/remover
item — mesmo padrão de UI já usado para fornecedores.

**`concluirProducao` agora dá saída automática de matéria-prima**: ao
concluir uma OP, além da entrada automática do produto acabado (já
existia, ADR-011), o sistema busca a ficha técnica do produto e lança
uma saída de cada matéria-prima (quantidade da ficha × quantidade
produzida). **Não bloqueia a conclusão se o saldo for insuficiente** —
diferente do lançamento manual de saída (que bloqueia), aqui preferimos
deixar o saldo ficar negativo como um sinal visível de que uma entrada
de matéria-prima está desatualizada, a impedir a fábrica de concluir
uma produção por causa de um estoque que pode estar apenas com o
lançamento manual atrasado.

### Catálogo de matéria-prima: materiais reais de Base/Baú

`Mola Ensacada` foi desativada (não é mais fabricada — só Base, Unibox
e Baú, ver ADR-015). Adicionados materiais reais de estrutura de
madeira: chapas de MDF (15mm e 6mm), sarrafo de pinus, parafusos (dois
tipos), pés plásticos, articulado com pistão (específico de Baú),
tinta esmalte e manta TNT de revestimento.

### Sobre as quantidades da ficha técnica: estimativa, não fato

Não tenho como saber com precisão quanto de cada material a fábrica do
Pedro realmente usa — isso varia por técnica de corte, fornecedor e
projeto. Populamos a ficha técnica de **um único produto de exemplo**
("Baú Queen Reforçado") com os números de um projeto público
documentado de base box queen com baú, como demonstração de como a
funcionalidade funciona:

- 2 chapas de MDF 15mm, 1 chapa de MDF 6mm
- 30m de sarrafo de pinus 20x45mm
- 100 parafusos 4,5x35mm, 32 parafusos de cabeça flangeada
- 2 conjuntos de articulado com pistão 600N
- 2 latas de tinta esmalte

Todo o resto do catálogo (Base Casal, Baú Solteiro, etc.) fica com
ficha técnica **vazia**, para não passar confiança falsa num número
que eu inventei. Precisa ser preenchido com o Pedro, produto por
produto e medida por medida.

## Consequências

- O custo calculado automaticamente a partir da ficha técnica só é
  confiável para produtos com ficha técnica real cadastrada — os
  demais continuam usando o campo `custo` manual do produto (ver
  ADR-014), que não muda com esta ADR.
- Uma saída de matéria-prima gerada automaticamente pela conclusão de
  uma OP pode deixar o saldo negativo — isso é esperado, não é um bug;
  sinaliza que uma entrada de matéria-prima precisa ser corrigida.
- Painel com gráficos comparando fornecedores (pedido pelo Pedro,
  passo seguinte) fica pra depois — ainda não existe biblioteca de
  gráficos no projeto.
