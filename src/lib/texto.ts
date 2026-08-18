// Normaliza pra comparacao de busca: minusculo, sem acento/til/cedilha.
// NFD separa a letra da marca diacritica em codepoints proprios (faixa
// Unicode "combining marks", 0x0300 a 0x036f) -- filtra essa faixa char
// a char (em vez de regex com o intervalo escrito por extenso, pra
// evitar qualquer ambiguidade de encoding no arquivo fonte). Assim
// "Joao"/"Joao", "SAO"/"Sao" etc. batem na busca mesmo com acentuacao
// diferente.
const COMBINING_MARKS_INICIO = 0x0300;
const COMBINING_MARKS_FIM = 0x036f;

export function normalizarBusca(texto: string): string {
  const semAcento = Array.from(texto.normalize("NFD"))
    .filter((char) => {
      const codigo = char.codePointAt(0) ?? 0;
      return codigo < COMBINING_MARKS_INICIO || codigo > COMBINING_MARKS_FIM;
    })
    .join("");
  return semAcento.trim().toLowerCase();
}
