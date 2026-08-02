# ADR-012: Cobrança e recibo (Fase 4)

- **Status:** Aceito
- **Data:** 2026-08-01

## Contexto

Fase 4 do roadmap: "Faturamento, cobrança e recibos". Como o tema toca
o lado financeiro (explicitamente fora do escopo original do MVP), três
decisões foram confirmadas com Ryan antes de modelar.

## Decisão

```prisma
enum StatusCobranca {
  PENDENTE
  PAGO
}

model Cobranca {
  id         String         @id @default(cuid())
  numero     Int            @unique @default(autoincrement())
  pedidoId   String         @unique
  pedido     Pedido         @relation(fields: [pedidoId], references: [id])
  vencimento DateTime
  status     StatusCobranca @default(PENDENTE)
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt
}
```

- **Cobrança sempre vinculada a um Pedido** (`pedidoId @unique`, 1:1):
  não existe cobrança avulsa. Só pode ser gerada a partir de um pedido
  já **faturado** (`Pedido.status = FATURADO`) — reforça o fluxo
  Pedido → Faturar → Cobrar.
- **Sem campo `valor` próprio**: como um pedido faturado é imutável
  (regra já existente desde o ADR-006), o valor da cobrança é sempre
  `pedido.valorTotal` — guardar um valor duplicado na `Cobranca` seria
  redundância sem nenhum ganho, e ainda abriria risco de divergência.
- **Status "Atrasado" nunca é salvo no banco** — só guardamos
  `PENDENTE`/`PAGO`. A tela calcula "Atrasado" comparando o vencimento
  com a data de hoje (fuso do Brasil, `-03:00` fixo — ver
  `src/lib/data.ts` e `src/lib/cobranca.ts`). Ninguém precisa lembrar de
  marcar manualmente.
- **"Recibo" é uma tela de visualização/impressão** (`/cobrancas/[id]`),
  reaproveitando o mesmo `ImprimirButton` e padrão visual da impressão
  de pedido (ADR-007). Nenhuma integração com banco ou gateway de
  pagamento — emissão de boleto real fica para a Fase 5, se vier a ser
  necessária.

### Fluxo

1. Pedido é faturado (`Pedido.status = FATURADO`).
2. Na tela do pedido, botão "Gerar cobrança" leva a
   `/pedidos/[id]/cobranca/nova`, onde só se informa o vencimento.
3. Cobrança criada redireciona para o recibo (`/cobrancas/[id]`), com
   botão para imprimir e para marcar como pago/pendente.
4. `/faturamento` lista todas as cobranças, com o mesmo controle de
   status.

## Consequências

- Extraídos para `src/lib/data.ts` os helpers de data com fuso do
  Brasil (`hojeBr`, `dataBr`, `limitesDoDiaBr`), antes só usados no
  relatório de faturamento por dia — agora reaproveitados pela
  Cobrança também.
- Sidebar: "Faturamento" sai do grupo "em breve" e vira link ativo.
  "Expedição" continua desabilitada (Fase 5).
- Se no futuro for necessário emitir boleto de verdade, será preciso
  integrar com um banco ou gateway de pagamento (Asaas, Iugu, etc.) —
  decisão a ser tomada e documentada em uma nova ADR quando chegar a
  hora.
