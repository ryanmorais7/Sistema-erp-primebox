function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function mascararCnpj(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function mascararCpf(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function mascararCep(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

// Detecta fixo (10 dígitos, 4+4) vs celular (11 dígitos, 5+4) pelo total
// digitado até agora — reflui pro formato de celular só quando o 11º
// dígito é digitado, igual à maioria das máscaras de telefone BR.
export function mascararTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Só aceita dígitos, tratados como centavos (estilo POS/maquininha): vai
// digitando da direita pra esquerda, sem deixar passar letra nenhuma.
// "150" -> "1,50"; "15000" -> "150,00".
export function mascararMoeda(valor: string): string {
  const d = apenasDigitos(valor);
  if (!d) return "";
  const numero = Number(d) / 100;
  return numero.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
