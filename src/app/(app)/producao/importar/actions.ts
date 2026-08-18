"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parsePlanilhaOp, type LinhaPlanilha } from "@/lib/planilhaOp";
import { precoParaNumero } from "@/lib/validations/moeda";
import { darBaixaInsumos } from "@/lib/estoque";
import {
  confirmarImportacaoProducaoSchema,
  type ConfirmarImportacaoProducaoValues,
} from "@/lib/validations/importarPlanilhaProducao";

type AnaliseResultado =
  | {
      success: true;
      titulo: string | null;
      itens: LinhaPlanilha[];
      clientesNovos: string[];
      produtosNovos: string[];
    }
  | { success: false; error: string };

function normalizar(texto: string) {
  return texto.trim().toLowerCase();
}

export async function analisarPlanilhaProducao(formData: FormData): Promise<AnaliseResultado> {
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { success: false, error: "Selecione um arquivo de planilha (.xlsx)." };
  }

  let analisado;
  try {
    const buffer = await arquivo.arrayBuffer();
    analisado = parsePlanilhaOp(buffer);
  } catch (erro) {
    return {
      success: false,
      error: erro instanceof Error ? erro.message : "Não consegui ler essa planilha.",
    };
  }

  if (analisado.linhas.length === 0) {
    return {
      success: false,
      error: "Não encontrei nenhuma linha com produto e cliente preenchidos na planilha.",
    };
  }

  const [clientesExistentes, produtosExistentes] = await Promise.all([
    prisma.cliente.findMany({ select: { razaoSocial: true, nomeFantasia: true } }),
    prisma.produto.findMany({ select: { nome: true } }),
  ]);
  const nomesClientes = new Set(
    clientesExistentes.flatMap((c) =>
      [c.razaoSocial, c.nomeFantasia].filter((v): v is string => Boolean(v)).map(normalizar),
    ),
  );
  const nomesProdutos = new Set(produtosExistentes.map((p) => normalizar(p.nome)));

  const clientesTextos = [...new Set(analisado.linhas.map((l) => l.cliente))];
  const produtosTextos = [...new Set(analisado.linhas.map((l) => l.produto))];

  return {
    success: true,
    titulo: analisado.titulo,
    itens: analisado.linhas,
    clientesNovos: clientesTextos.filter((t) => !nomesClientes.has(normalizar(t))),
    produtosNovos: produtosTextos.filter((t) => !nomesProdutos.has(normalizar(t))),
  };
}

type OpCriada = { tipo: "formal" | "avulsa"; numeroLabel: string; clienteNome: string; itens: number };

type ConfirmarResultado =
  | { success: true; ops: OpCriada[]; avisosEstoque: string[] }
  | { success: false; error: string };

// Mesma decisão formal-vs-avulsa do formulário manual de Criar OP (ver
// ADR-033, criarOrdemAvulsa): cliente cadastrado (existente ou marcado
// "cadastrar" na conferência) vira Pedido formal com OrdemProducao;
// cliente sem cadastro vira OrdemAvulsa. Dentro de cada tipo, agrupa
// por cliente — uma OP nunca mistura clientes diferentes.
export async function confirmarImportacaoProducao(
  dadosBrutos: ConfirmarImportacaoProducaoValues,
): Promise<ConfirmarResultado> {
  const resultado = confirmarImportacaoProducaoSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return { success: false, error: "Verifique os campos destacados na conferência." };
  }
  const dados = resultado.data;
  const dataProgramadaParsed = dados.dataProgramada
    ? new Date(`${dados.dataProgramada}T00:00:00`)
    : null;

  try {
    const opsCriadas = await prisma.$transaction(async (tx) => {
      const mapaClientesNovos = new Map<string, string>();
      for (const cliente of dados.clientesNovos) {
        if (!cliente.cadastrar) continue;
        const criado = await tx.cliente.create({
          data: { razaoSocial: cliente.texto, telefone: cliente.telefone },
        });
        mapaClientesNovos.set(normalizar(cliente.texto), criado.id);
      }

      let medidaPadraoId: string | undefined;
      const mapaProdutosNovos = new Map<string, { id: string; preco: number; custo: number }>();
      for (const produto of dados.produtosNovos) {
        let medidaId = produto.medidaId;
        if (!medidaId) {
          medidaPadraoId ??= (await tx.medida.findFirst({ select: { id: true } }))?.id;
          if (!medidaPadraoId) {
            throw new Error("Não há nenhuma medida cadastrada no sistema pra usar como padrão.");
          }
          medidaId = medidaPadraoId;
        }
        const criado = await tx.produto.create({
          data: {
            nome: produto.texto,
            tipo: produto.tipo,
            medidaId,
            preco: precoParaNumero(produto.preco),
            custo: precoParaNumero(produto.custo),
          },
        });
        mapaProdutosNovos.set(normalizar(produto.texto), {
          id: criado.id,
          preco: Number(criado.preco),
          custo: Number(criado.custo),
        });
      }

      const [clientesExistentes, produtosExistentes] = await Promise.all([
        tx.cliente.findMany({ select: { id: true, razaoSocial: true, nomeFantasia: true } }),
        tx.produto.findMany({ select: { id: true, nome: true, preco: true, custo: true } }),
      ]);

      function resolverClienteId(texto: string): string | undefined {
        const alvo = normalizar(texto);
        if (mapaClientesNovos.has(alvo)) return mapaClientesNovos.get(alvo);
        return clientesExistentes.find(
          (c) =>
            normalizar(c.razaoSocial) === alvo || (c.nomeFantasia && normalizar(c.nomeFantasia) === alvo),
        )?.id;
      }
      function resolverProduto(texto: string) {
        const alvo = normalizar(texto);
        if (mapaProdutosNovos.has(alvo)) return mapaProdutosNovos.get(alvo);
        const achado = produtosExistentes.find((p) => normalizar(p.nome) === alvo);
        return achado ? { id: achado.id, preco: Number(achado.preco), custo: Number(achado.custo) } : undefined;
      }

      const itensResolvidos = dados.itens.map((item) => {
        const produto = resolverProduto(item.produtoTexto);
        if (!produto) {
          throw new Error(`Produto "${item.produtoTexto}" não foi encontrado nem preenchido como novo.`);
        }
        return { item, produto, clienteId: resolverClienteId(item.clienteTexto) };
      });

      const criadas: OpCriada[] = [];
      // Linhas pra dar baixa de insumo depois que a transação confirmar
      // (ver darBaixaInsumos — usa o client global, não o `tx`, então
      // roda fora da transação, mesmo padrão já usado em
      // concluirProducao/concluirProducaoAvulsa).
      const linhasParaBaixa: { produtoId: string; quantidade: number; rotulo: string }[] = [];

      const formaisPorCliente = new Map<string, typeof itensResolvidos>();
      // Todas as linhas avulsas da planilha caem numa OrdemAvulsa só,
      // mesmo sendo de clientes diferentes — mesma decisão de
      // criarOrdemAvulsa (ver ADR-034).
      const avulsos: typeof itensResolvidos = [];
      for (const resolvido of itensResolvidos) {
        if (resolvido.clienteId) {
          const grupo = formaisPorCliente.get(resolvido.clienteId) ?? [];
          grupo.push(resolvido);
          formaisPorCliente.set(resolvido.clienteId, grupo);
        } else {
          avulsos.push(resolvido);
        }
      }

      for (const [clienteId, itens] of formaisPorCliente) {
        const itensPedido = itens.map(({ item, produto }) => ({
          produtoId: produto.id,
          quantidade: item.quantidade,
          precoUnitario: produto.preco,
          custoUnitario: produto.custo,
        }));
        const valorTotal = itensPedido.reduce(
          (total, item) => total + item.precoUnitario * item.quantidade,
          0,
        );
        const observacoes = itens
          .map(({ item }) => item.observacao)
          .filter((obs): obs is string => Boolean(obs && obs.trim()))
          .join("; ");

        const pedido = await tx.pedido.create({
          data: {
            clienteId,
            valorTotal,
            observacoes: observacoes || null,
            itens: { create: itensPedido },
          },
          include: { itens: true, cliente: true },
        });
        for (const itemPedido of pedido.itens) {
          const ordem = await tx.ordemProducao.create({
            data: { itemPedidoId: itemPedido.id, dataProgramada: dataProgramadaParsed },
          });
          linhasParaBaixa.push({
            produtoId: itemPedido.produtoId,
            quantidade: itemPedido.quantidade,
            rotulo: `OP #${ordem.numero}`,
          });
        }
        criadas.push({
          tipo: "formal",
          numeroLabel: `OP #${pedido.numero}`,
          clienteNome: pedido.cliente.nomeFantasia || pedido.cliente.razaoSocial,
          itens: itensPedido.length,
        });
      }

      if (avulsos.length > 0) {
        const ordem = await tx.ordemAvulsa.create({
          data: {
            itens: {
              create: avulsos.map(({ item, produto }) => ({
                produtoId: produto.id,
                quantidade: item.quantidade,
                clienteTexto: item.clienteTexto,
                observacao: item.observacao || null,
                dataProgramada: dataProgramadaParsed,
              })),
            },
          },
          include: { itens: true },
        });
        for (const item of ordem.itens) {
          linhasParaBaixa.push({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            rotulo: `OP Avulsa #${ordem.numero}`,
          });
        }
        const clientesDistintos = [...new Set(avulsos.map(({ item }) => item.clienteTexto))];
        criadas.push({
          tipo: "avulsa",
          numeroLabel: `OP #${ordem.numero}`,
          clienteNome: clientesDistintos.join(" · "),
          itens: avulsos.length,
        });
      }

      return { criadas, linhasParaBaixa };
    });

    const avisosEstoque: string[] = [];
    for (const linha of opsCriadas.linhasParaBaixa) {
      const { avisos } = await darBaixaInsumos(linha.produtoId, linha.quantidade, linha.rotulo);
      avisosEstoque.push(...avisos);
    }

    revalidatePath("/producao");
    revalidatePath("/pedidos");
    revalidatePath("/clientes");
    revalidatePath("/produtos");
    revalidatePath("/estoque");
    return { success: true, ops: opsCriadas.criadas, avisosEstoque: [...new Set(avisosEstoque)] };
  } catch (erro) {
    return {
      success: false,
      error: erro instanceof Error ? erro.message : "Erro ao importar a planilha.",
    };
  }
}
