# ADR-005: Refinamento de paleta e tipografia

- **Status:** Aceito
- **Data:** 2026-07-30

## Contexto

O ADR-004 definiu uma primeira paleta (sidebar escura + laranja vivo,
fontes Geist). Ryan trouxe uma segunda referência visual mais refinada,
com paleta creme/cobre/verde-azulado e uma combinação de três fontes
(Space Grotesk para títulos, Inter para texto, IBM Plex Mono para
rótulos e dados tabulares). Essa segunda referência é mais sóbria e
"editorial" do que a primeira, alinhando melhor com o pedido original de
paleta "sóbria e séria" (ADR-001).

## Decisão

Adotado do novo mockup (baixo custo, ganho sistêmico):

- **Paleta:** fundo creme (`#F7F5F1`), texto/tinta escura (`#1C2321`),
  cobre como cor de destaque (`#C9622B`, substitui o laranja do
  ADR-004) e verde-azulado (`#4B7B6F`, novo token `--positive` /
  `--positive-soft`) para indicar status "Ativo". Sidebar continua
  fixa escura (agora `#1C2321`, tom acompanha a tinta do tema claro),
  independente de tema claro/escuro.
- **Tipografia:** `Space Grotesk` (títulos, `font-heading`), `Inter`
  (texto padrão, `font-sans`), `IBM Plex Mono` (rótulos em caixa alta,
  ex. "PrimeBox ERP" acima do título de página, labels de grupo na
  sidebar, rodapé). Carregadas via `next/font/google` (self-hosted,
  sem depender de CDN externo em runtime).
- **Ações em tabela:** botões de texto ("Editar"/"Ativar"/"Desativar")
  trocados por botões de ícone (lápis, check, x) nas listagens de
  Cliente e Produto — mais compacto e escaneável.

Não adotado do mockup (custo/benefício não justifica agora):

- Corte diagonal decorativo no canto dos cards de estatística — só
  estético, sem função.
- Alternância de telas por abas (JavaScript) — já temos rotas de
  verdade no Next.js, que é superior a isso.
- Cards de "Pedidos em carteira", "Valor em carteira" e o "Fluxo do
  pedido" no Painel — dependem do módulo de Pedido, que ainda não
  existe. Mostrar esses números agora seria dado fabricado. Revisitar
  quando Pedido for implementado.

## Consequências

- `--brand` (usado no rótulo "PrimeBox ERP" acima de cada título) agora
  aponta para o cobre em vez do laranja do ADR-004.
- Novos tokens `--positive` / `--positive-soft` ficam disponíveis para
  qualquer indicação de status positivo futura (não só o badge
  "Ativo").
- `.dark` recebeu uma paleta escura própria e coerente com a nova
  paleta clara (não é mais idêntica ao ADR-004), mesmo sem um toggle de
  tema implementado ainda — mantém a estrutura pronta para quando for
  necessário, como já previsto no ADR-001.
