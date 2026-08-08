# ADR-023: Comprovante de recebimento (2 vias) no recibo do pedido

- **Status:** Aceito
- **Data:** 2026-08-08

## Contexto

O sistema não tinha nenhum documento que comprovasse a entrega da
mercadoria — a Expedição (`AGUARDANDO → EM_ROTA → ENTREGUE`) é só um status
no banco, sem nada impresso. Ryan precisa que, quando o funcionário for
entregar o pedido na casa do cliente, tenha um papel pra o cliente assinar
confirmando o recebimento: uma via fica com o cliente, outra volta pra
PrimeBox como comprovante.

## Decisão

Em vez de criar uma tela/documento novo ligado à Expedição, o bloco de
assinatura foi adicionado direto no recibo do pedido que já existia
(`/pedidos/[id]`, o mesmo que tem o botão "Imprimir"). Motivo: o
funcionário já leva esse pedido impresso pra entrega; não faz sentido
imprimir dois papéis diferentes (um comercial, outro de recebimento)
quando cabe tudo no mesmo.

O bloco tem duas colunas lado a lado — **"1ª via — PrimeBox"** e **"2ª via
— Cliente"** — cada uma com espaço pra nome de quem recebeu, assinatura e
data. As duas colunas são idênticas de propósito: a ideia é imprimir uma
vez, cortar ou assinar as duas, o funcionário volta com a via PrimeBox
assinada e deixa a via Cliente com o comprador.

Fica dentro da mesma área que já é escondida na impressão pra dados
internos (custo, margem) — ou seja, o comprovante de recebimento aparece
tanto na tela quanto na impressão, mas nunca mostra dado de uso interno,
porque está fora dos blocos `print:hidden` já existentes nessa página.

Não criei nenhuma tabela nova nem campo pra guardar "quem assinou" no
banco — é só texto pra preencher a mão no papel. Se um dia for necessário
guardar digitalmente quem recebeu (nome, data) pra consulta posterior, aí
sim precisaria de um campo na Expedição — não implementado agora porque
não foi pedido.

## Consequências

- O comprovante aparece em **todo** pedido impresso, não só nos que já
  foram entregues — é inofensivo aparecer cedo (só ocupa espaço em
  branco), e evita ter que decidir uma regra de "a partir de quando
  mostrar" sem necessidade real hoje.
- Nenhuma mudança de schema, nenhuma migration — é só JSX/CSS na página
  que já existia.
