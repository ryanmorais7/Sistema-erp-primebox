// PrimeBox opera no horário do Brasil; usamos -03:00 fixo (sem horário de
// verão desde 2019) em vez do UTC do servidor para datas de negócio
// (vencimento, "hoje", limites de um dia).

export function dataBr(data: string): Date {
  return new Date(`${data}T00:00:00-03:00`);
}

export function limitesDoDiaBr(data: string) {
  const inicio = dataBr(data);
  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + 1);
  return { inicio, fim };
}

// Mesma lógica de limitesDoDiaBr, mas pro intervalo entre duas datas
// (início do primeiro dia até o fim do último, ambos inclusive).
export function limitesDoPeriodoBr(dataInicio: string, dataFim: string) {
  const inicio = dataBr(dataInicio);
  const fim = new Date(dataBr(dataFim));
  fim.setUTCDate(fim.getUTCDate() + 1);
  return { inicio, fim };
}

export function hojeBr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
