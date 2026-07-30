# ADR-004: Identidade visual (paleta de cores e navegação)

- **Status:** Aceito
- **Data:** 2026-07-30

## Contexto

O ADR-001 deixou a paleta de cores como "a definir juntos". Com Cadastro
de Clientes e Produtos já implementados, Ryan trouxe uma referência
visual (mockup) para decidir a identidade antes de continuar, evitando
retrabalho de redesenhar mais telas depois.

## Decisão

- **Navegação:** sidebar lateral fixa (`src/components/layout/app-sidebar.tsx`),
  usando o componente `Sidebar` do shadcn/ui, com dois grupos:
  - "Operação": Painel, Clientes, Produtos (implementados) e Pedidos
    (ainda não implementado, aparece desabilitado com selo "em breve" —
    é escopo do MVP, só falta construir).
  - "Próximas fases": Produção, Estoque, Financeiro — desabilitados com
    selo "em breve", deixados visíveis apenas como orientação de roadmap,
    **sem nenhuma funcionalidade real por trás** (não é implementação
    dessas fases, só navegação ilustrativa, conforme combinado).
- **Paleta:** sidebar permanece sempre escura (`#1c1917`), independente
  de tema claro/escuro, com laranja (`#ea580c`) como cor de destaque
  (item de menu ativo, ícone da logo). O restante da interface (botões,
  formulários) segue neutro, como já estava — o laranja é reservado para
  navegação e o rótulo "PrimeBox ERP" acima do título de cada página.
- **Painel (`/`):** mostra apenas números reais já existentes hoje
  (clientes ativos, produtos ativos). Não inclui cards de Pedido nem o
  "fluxo do pedido" do mockup, porque o módulo de Pedido ainda não
  existe — isso será revisitado quando Pedido for implementado.

## Consequências

- Toda nova página herda a sidebar e o cabeçalho padrão
  (`PageHeader`) automaticamente, sem precisar reaplicar estilo.
- O selo "em breve" em Produção/Estoque/Financeiro comunica o roadmap
  sem implementar nada fora do escopo combinado.
- Corrigido um erro de lint pré-existente no hook `useIsMobile` (gerado
  pelo CLI do shadcn) trocando `useEffect` + `setState` síncrono por
  `useSyncExternalStore`, que é o padrão correto do React para assinar
  mudanças de `matchMedia` — o build da Vercel falha se o lint tiver
  erros, então isso precisou ser corrigido antes deste deploy.
