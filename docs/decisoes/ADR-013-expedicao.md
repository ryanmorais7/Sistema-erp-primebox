# ADR-013: Expedição (Fase 5, parcial)

- **Status:** Aceito
- **Data:** 2026-08-02

## Contexto

Fase 5 do roadmap era "Expedição, boleto e nota fiscal". Boleto real
exige contratar um banco/gateway de pagamento; nota fiscal eletrônica
exige certificado digital e integração com a SEFAZ (ou um provedor como
Focus NFe/eNotas), além de envolver o contador da empresa — nenhum dos
dois é uma decisão só técnica, e ambos ficaram de fora por decisão
explícita de Ryan. Só a Expedição (rastreio de entrega) foi
implementada nesta etapa.

## Decisão

```prisma
enum StatusExpedicao {
  AGUARDANDO
  EM_ROTA
  ENTREGUE
}

model Expedicao {
  id             String          @id @default(cuid())
  numero         Int             @unique @default(autoincrement())
  pedidoId       String          @unique
  pedido         Pedido          @relation(fields: [pedidoId], references: [id])
  transportadora String?
  status         StatusExpedicao @default(AGUARDANDO)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}
```

- **Uma Expedição por Pedido** (1:1, como Cobrança), com
  `transportadora` como texto livre opcional.
- **Sem trava de status do Pedido**: diferente da Cobrança (que exige
  pedido faturado), a Expedição pode ser gerada independente do status
  do pedido — não foi definida uma regra de negócio exigindo isso, e
  forçar uma trava sem necessidade real adicionaria fricção sem
  benefício claro.
- **Quadro com 3 colunas e botões** (Aguardando → Em rota → Entregue),
  mesmo padrão já usado em Produção (ADR-010): sem drag-and-drop, sem
  biblioteca nova.
- Gerada a partir da tela do pedido (`/pedidos/[id]/expedicao/nova`),
  mesmo padrão da Cobrança (ADR-012).

## Consequências

- Sidebar: "Expedição" sai do grupo "em breve" e vira link ativo, sob
  o grupo Financeiro (mesma organização do protótipo de referência).
  **Com isso, todos os itens da sidebar estão ativos** — não sobrou
  nenhum grupo "em breve"; o selo foi removido do componente porque
  deixou de ser usado.
- Boleto bancário real e nota fiscal eletrônica continuam sem
  implementação. Quando Ryan decidir avançar nisso, será necessário: (1)
  escolher e contratar um gateway/banco para boleto, e (2) resolver
  certificado digital + provedor de NF-e com o contador — ambos exigem
  uma nova conversa de escopo antes de qualquer código, dado o peso
  legal/financeiro envolvido.
