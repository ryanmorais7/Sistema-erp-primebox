import * as XLSX from "xlsx";

export type LinhaPlanilha = {
  quantidade: number;
  produto: string;
  cliente: string;
  observacao: string;
};

export type PlanilhaAnalisada = {
  titulo: string | null;
  linhas: LinhaPlanilha[];
};

const ALIASES_COLUNA: Record<string, keyof LinhaPlanilha> = {
  QUANT: "quantidade",
  QUANTIDADE: "quantidade",
  QTD: "quantidade",
  PRODUTO: "produto",
  CLIENTE: "cliente",
  OBSERVACAO: "observacao",
  OBS: "observacao",
};

function normalizarCabecalho(valor: unknown): string {
  return String(valor ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

// Formato esperado (planilha do Pedro): uma linha de titulo opcional (ex:
// "OP 13-08 JUNIOR"), uma linha de cabecalho com QUANT/PRODUTO/CLIENTE/
// OBSERVACAO em qualquer ordem/coluna, linhas de dados ate encontrar uma
// linha sem produto nem cliente (linha de total, ou fim da planilha).
export function parsePlanilhaOp(buffer: ArrayBuffer): PlanilhaAnalisada {
  const workbook = XLSX.read(buffer, { type: "array" });
  const primeiraAba = workbook.SheetNames[0];
  const sheet = workbook.Sheets[primeiraAba];
  const linhasBrutas: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  let indiceCabecalho = -1;
  let mapaColunas: Record<number, keyof LinhaPlanilha> = {};

  for (let i = 0; i < linhasBrutas.length; i++) {
    const linha = linhasBrutas[i];
    const mapa: Record<number, keyof LinhaPlanilha> = {};
    linha.forEach((celula, coluna) => {
      const chave = ALIASES_COLUNA[normalizarCabecalho(celula)];
      if (chave) mapa[coluna] = chave;
    });
    // Precisa achar pelo menos produto e cliente pra considerar cabecalho valido.
    const valores = Object.values(mapa);
    if (valores.includes("produto") && valores.includes("cliente")) {
      indiceCabecalho = i;
      mapaColunas = mapa;
      break;
    }
  }

  if (indiceCabecalho === -1) {
    throw new Error(
      "Não encontrei as colunas QUANT/PRODUTO/CLIENTE na planilha. Confira se a primeira aba tem esses cabeçalhos.",
    );
  }

  const titulo =
    indiceCabecalho > 0
      ? linhasBrutas
          .slice(0, indiceCabecalho)
          .flat()
          .map((v) => String(v ?? "").trim())
          .find((v) => v.length > 0) ?? null
      : null;

  const linhas: LinhaPlanilha[] = [];
  for (let i = indiceCabecalho + 1; i < linhasBrutas.length; i++) {
    const linha = linhasBrutas[i];
    const registro: Partial<LinhaPlanilha> = {};
    for (const [coluna, chave] of Object.entries(mapaColunas)) {
      const valor = linha[Number(coluna)];
      if (chave === "quantidade") {
        registro.quantidade = Number(valor) || 0;
      } else {
        registro[chave] = String(valor ?? "").trim();
      }
    }

    const produto = registro.produto?.trim() ?? "";
    const cliente = registro.cliente?.trim() ?? "";
    if (!produto && !cliente) {
      // linha de total ou separadora: para a leitura por aqui.
      break;
    }
    if (!produto || !cliente) {
      // linha incompleta (ex: linha em branco no meio) — ignora e segue.
      continue;
    }

    linhas.push({
      quantidade: registro.quantidade && registro.quantidade > 0 ? registro.quantidade : 1,
      produto,
      cliente,
      observacao: registro.observacao ?? "",
    });
  }

  return { titulo, linhas };
}
