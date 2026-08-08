# ADR-027: Cor de fundo sumindo na impressão (logo laranja)

- **Status:** Aceito
- **Data:** 2026-08-08

## Contexto

Ryan reportou que a logo da caixa laranja não aparece na impressão real
(só o texto "PrimeBox"), mesmo já tendo funcionado nos meus testes
anteriores. O motivo: a maioria dos navegadores, por padrão, **não
imprime cor de fundo/gradiente** (a opção costuma se chamar "Gráficos em
segundo plano"/"Background graphics", desligada por padrão) — só o texto
e bordas normais são impressos. A logo é feita 100% com
`background: linear-gradient(...)`, então sem essa opção ligada ela
simplesmente não existe na página impressa, e o ícone branco fica
invisível (branco sobre fundo branco/creme).

Isso explica por que meus testes anteriores não pegaram o problema: eu
testava tirando print da tela renderizada como impressão (emula o CSS,
mas não desliga cor de fundo, porque isso é uma decisão do motor de
impressão do navegador, não do CSS renderizado na tela).

## Decisão

Adicionado em `globals.css`:

```css
@media print {
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

Essa é a propriedade CSS padrão pra forçar o navegador a imprimir cor de
fundo/gradiente exatamente como definido, independente da opção de
"gráficos em segundo plano" estar ligada ou não no diálogo de impressão.
Suportada por todos os navegadores modernos (Chrome, Edge, Safari,
Firefox).

Testado gerando um PDF de verdade (via engine de impressão do Chromium,
com a opção de fundo explicitamente desligada) para confirmar que a
correção funciona nesse cenário — não só visualmente na tela.

## Cabeçalho/rodapé do navegador (URL, data, "PrimeBox ERP", número de página)

Isso **não é gerado pela nossa página** — é uma opção do próprio
navegador ("Cabeçalhos e rodapés", ligada por padrão em Chrome/Edge no
diálogo de impressão). Adicionei `@page { margin: 10mm; }` no CSS, que
ajuda a reduzir o espaço reservado pra isso em alguns navegadores, mas
**não há garantia de que isso remova completamente** em todos os
navegadores/dispositivos — é uma decisão do navegador de quem está
imprimindo, fora do controle da página.

A forma garantida de remover: no diálogo de impressão, em "Mais
configurações" (Chrome/Edge), desmarcar "Cabeçalhos e rodapés". É uma
configuração que o navegador costuma lembrar depois da primeira vez.

## Consequências

- Corrige a logo (e qualquer outro fundo colorido, como os badges de
  status) sumindo na impressão, em qualquer navegador.
- O texto "PrimeBox ERP" que aparecia no rodapé impresso vem do
  cabeçalho/rodapé do próprio navegador (usa o `<title>` da página) — não
  é algo que a aplicação injeta na impressão. Não há como forçar isso a
  sumir via código; depende da configuração de quem imprime.
