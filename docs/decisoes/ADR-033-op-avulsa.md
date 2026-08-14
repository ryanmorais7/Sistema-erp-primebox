# ADR-033: OP avulsa direto em Produção, sem exigir Pedido/Cliente formal

- **Status:** Aceito
- **Data:** 2026-08-14

## Contexto

O Pedro faz muita produção avulsa no dia a dia (pra conhecidos, clientes
ocasionais), sem cadastro formal de cliente nem passar pela tela de
Pedidos. Hoje ele controla isso numa planilha simples: quantidade,
produto, nome do cliente (texto livre, às vezes "Avulso"), observação.
O fluxo formal (Cliente cadastrado → Pedido → OP) continua necessário
pra clientes recorrentes (histórico, cobrança), mas não pode ser o
único caminho.

## Decisão

### Tabelas novas, isoladas do fluxo formal

`OrdemAvulsa` (numeração própria "OP Avulsa #N") e `ItemOrdemAvulsa`
(quantidade, produto, `clienteTexto` livre, `clienteId` opcional só
informativo, observação, preço opcional, status próprio — mesmo enum
`StatusOrdemProducao` do fluxo formal). Faturamento por período e o
relatório "Por cliente" continuam consultando só `Pedido`/`Cliente` —
nunca tocam nessas tabelas novas, então produção avulsa não aparece
nesses relatórios nem polui um cliente real com nomes avulsos
diferentes.

`Expedicao.pedidoId` virou opcional e ganhou `itemOrdemAvulsaId`
opcional (mutuamente exclusivos, garantido na camada de ação, não no
banco) — permite gerar expedição a partir de uma linha avulsa
concluída.

### Uma tela, split automático por linha

Em vez de dois formulários separados, `/producao/nova` é um formulário
único de múltiplas linhas (quantidade, produto, cliente, observação,
preço). Ao salvar (`criarOrdemAvulsa`), cada linha é decidida
individualmente:

- **Cliente com cadastro bate ou é criado ali mesmo** (autocomplete com
  opção "Cadastrar '{texto}' como cliente", via `criarClienteRapido`)
  → linha vira **Pedido formal de verdade** (agrupando por cliente
  dentro da mesma submissão, igual à importação de planilha —
  ADR-031): cria/reaproveita 1 Pedido por cliente distinto, com
  ItemPedido + OrdemProducao normais, numeração "OP #N" e tudo
  integrado aos relatórios.
- **Texto livre sem cadastro** ("Avulso", nome não encontrado) → todas
  as linhas nessa situação, na mesma submissão, viram **uma única**
  `OrdemAvulsa` com várias `ItemOrdemAvulsa`.

Preço é opcional nos dois casos; se vazio no caminho formal, cai no
preço de catálogo do produto (mesma regra de outros fluxos do
sistema). No caminho avulso, fica só de referência — nunca afeta
Faturamento.

O campo Produto segue o mesmo padrão do Cliente: texto livre com
autocomplete contra o catálogo existente e opção "Cadastrar '{texto}'
como produto" ali mesmo (`criarProdutoRapido`), pedindo só tipo,
medida e preço (custo default 0) — sem forçar sair da tela pra
cadastrar produto novo antes de lançar a OP.

### Board de Produção mesclado, folha impressa unificada

`/producao` busca `OrdemProducao` e `ItemOrdemAvulsa` juntos, mescla
num tipo `Cartao` comum e ordena tudo por `createdAt` (FIFO real,
cruzando as duas origens). Cartões avulsos têm uma badge "avulsa" pra
diferenciar visualmente. Agrupamento por cor na folha impressa usa
`clienteId` (formal) ou `clienteTexto` normalizado (avulsa) como chave
— mesmo texto livre repetido agrupa junto.

### Reaproveitamento

A baixa de estoque ao concluir (entrada de produto acabado + saída de
matéria-prima pela ficha técnica) foi extraída pra
`darBaixaProducaoConcluida()` em `src/lib/estoque.ts`, chamada pelos
dois fluxos. O recibo com canhoto virou um componente compartilhado
(`ReciboLinha`), usado por `/producao/recibo/formal/[id]` e
`/producao/recibo/avulsa/[id]` — o avulso simplesmente não recebe
`clienteSecundaria`/`clienteEndereco`, então esses campos somem do
recibo sem lógica condicional extra no componente.

### Cancelar OP em qualquer etapa, com estorno automático

"Cancelar OP" aparece nas três colunas do board (Aguardando, Em
produção, Concluído), nos dois fluxos. Cancelar uma OP já concluída
estorna o estoque automaticamente via
`reverterBaixaProducaoConcluida()` (saída do produto acabado, entrada
de volta das matérias-primas da ficha técnica) — sempre lançando
movimentos novos, nunca apagando o histórico de movimentos já
existente. Testado localmente: saldo volta exatamente ao valor de
antes da conclusão. Uma linha avulsa que já tem expedição gerada não
pode mais ser cancelada (travado em `cancelarItemOrdemAvulsa`, mesma
lógica de proteção que `excluirPedido` já usa pro fluxo formal) — isso
evitaria deixar uma expedição órfã.

## Consequências

- Duas sequências de numeração de OP coexistem ("OP #7" formal, "OP
  Avulsa #3" avulsa) — visualmente distinguíveis, nunca se confundem
  porque o rótulo já diz qual é qual.
- `/expedicao` agora trata `pedido` como opcional e usa
  `itemOrdemAvulsa` como origem alternativa — telas que assumiam
  `expedicao.pedido` sempre existir foram ajustadas.
