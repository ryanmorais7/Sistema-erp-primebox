# ADR-008: Ajustes visuais a partir do protótipo de referência

- **Status:** Aceito
- **Data:** 2026-07-31

## Contexto

Ryan trouxe um protótipo visual completo (PDF, feito em outra conversa)
cobrindo todas as telas do sistema, incluindo fases futuras (Produção,
Estoque, Faturamento, Expedição) e uma tela de login. O próprio
documento organiza isso em fases (MVP agora, Fase 2 a 5), confirmando
que grande parte do conteúdo é roadmap, não pedido de implementação
imediata.

## Decisão

**Aplicado agora** (dentro do escopo já existente):

- Sidebar reorganizada em três grupos, como no protótipo: **Comercial**
  (Painel, Clientes, Produtos, Pedidos — funcionais), **Fábrica**
  (Produção, Estoque) e **Financeiro** (Faturamento, Expedição) — as
  duas últimas continuam desabilitadas com selo "em breve", sem nenhuma
  funcionalidade real por trás.
- Painel (`/`) ganhou 4 cards com dados reais, agora possível porque o
  módulo de Pedido existe: Pedidos em carteira, Pedidos faturados,
  Clientes ativos, Valor em carteira (soma dos pedidos em carteira). Sem
  gráfico de faturamento mensal (decisão explícita de Ryan: exigiria
  biblioteca nova e fica para depois).
- Painel também ganhou uma tabela "Pedidos recentes" (últimos 5).
- Listagem de Pedidos (`/pedidos`) ganhou filtro por abas (Todos / Em
  carteira / Faturados) via query string (`?status=...`), sem JavaScript
  de cliente — cada aba é um link comum.
- Tela de impressão de pedido ganhou botões "Baixar PDF" e "Enviar
  WhatsApp" desabilitados com selo "em breve", ao lado do botão
  "Imprimir" (que já funciona) — mesmo tratamento visual já usado na
  sidebar para fases futuras.

**Não aplicado agora** (confirmado com Ryan):

- Tela de login/autenticação por funcionário — é uma feature real
  (sessão, cadastro de usuário, proteção de rota), não só visual.
- Assistente de "Novo pedido" em 3 etapas (Cliente → Itens → Revisão) —
  mantido o formulário de página única atual, já funcional e testado.
- Gráfico de faturamento mensal no Painel.
- Botão de WhatsApp funcional na listagem de pedidos.
- As telas completas de Produção, Estoque, Faturamento e Expedição —
  são Fase 2 a 5 do próprio roadmap que Ryan compartilhou.

## Consequências

- A paleta e tipografia já definidas nos ADR-004/005 se mostraram bem
  próximas do protótipo de referência — não foi necessário mudar cores
  ou fontes, só reorganizar/enriquecer telas existentes.
- Os botões "em breve" (Baixar PDF, Enviar WhatsApp, Produção, Estoque,
  Faturamento, Expedição) formam um padrão visual único no sistema para
  sinalizar roadmap sem implementar nada — deve ser reaproveitado nas
  próximas fases em vez de criar um padrão novo.
