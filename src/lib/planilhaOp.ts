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
  QTDE: "quantidade",
  PRODUTO: "produto",
  CLIENTE: "cliente",
  OBSERVACAO: "observacao",
  OBS: "observacao",
};

function normalizarTexto(valor: unknown): string {
  return String(valor ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function normalizarCabecalho(valor: unknown): string {
  return normalizarTexto(valor).replace(/[.:]+$/, "");
}

// Tenta achar a medida pelo nome dela dentro do texto do produto (ex:
// "3 BASE QUEEN SAT 07" contém "QUEEN"). Medidas maiores primeiro, pra
// "SUPER KING" não perder pra "KING" quando os dois aparecem no nome.
export function inferirMedidaId(
  produtoTexto: string,
  medidas: { id: string; nome: string }[],
): string | undefined {
  const texto = normalizarTexto(produtoTexto);
  const ordenadas = [...medidas].sort((a, b) => b.nome.length - a.nome.length);
  const achada = ordenadas.find((medida) => {
    const nome = normalizarTexto(medida.nome).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^A-Z])${nome}([^A-Z]|$)`).test(texto);
  });
  return achada?.id;
}

function acharCabecalho(linhasBrutas: unknown[][]) {
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
      return { indice: i, mapa };
    }
  }
  return null;
}

// Formato esperado (planilha do Pedro): uma linha de titulo opcional (ex:
// "OP 13-08 JUNIOR"), uma linha de cabecalho com QUANT/PRODUTO/CLIENTE/
// OBSERVACAO em qualquer ordem/coluna, linhas de dados ate encontrar uma
// linha sem produto nem cliente (linha de total, ou fim da planilha).
// Verifica todas as abas do arquivo, não só a primeira — a planilha pode
// ter mais de uma aba (ex: "OP" e "FINANCEIRO") em qualquer ordem interna.
export function parsePlanilhaOp(buffer: ArrayBuffer): PlanilhaAnalisada {
  const workbook = XLSX.read(buffer, { type: "array" });

  const diagnostico: string[] = [];

  for (const nomeAba of workbook.SheetNames) {
    const sheet = workbook.Sheets[nomeAba];
    const linhasBrutas: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    const cabecalho = acharCabecalho(linhasBrutas);
    if (!cabecalho) {
      diagnostico.push(`"${nomeAba}" (${linhasBrutas.length} linha(s), sem PRODUTO+CLIENTE)`);
      continue;
    }

    const { indice: indiceCabecalho, mapa: mapaColunas } = cabecalho;

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

    if (linhas.length > 0) {
      return { titulo, linhas };
    }
    diagnostico.push(`"${nomeAba}" (cabeçalho achado na linha ${indiceCabecalho + 1}, mas 0 linhas de dados depois)`);
  }

  throw new Error(
    `Não encontrei uma aba com colunas QUANT/PRODUTO/CLIENTE preenchidas. Abas verificadas: ${diagnostico.join("; ")}.`,
  );
}
