"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parsePlanilhaOp, type LinhaPlanilha } from "@/lib/planilhaOp";
import { precoParaNumero } from "@/lib/validations/moeda";
import { confirmarImportacaoSchema, type ConfirmarImportacaoValues } from "@/lib/validations/importarPlanilha";

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

export async function analisarPlanilha(formData: FormData): Promise<AnaliseResultado> {
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

type PedidoCriado = { id: string; numero: number; clienteNome: string; itens: number };

type ConfirmarResultado =
  | { success: true; pedidos: PedidoCriado[] }
  | { success: false; error: string };

export async function confirmarImportacao(
  dadosBrutos: ConfirmarImportacaoValues,
): Promise<ConfirmarResultado> {
  const resultado = confirmarImportacaoSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return { success: false, error: "Verifique os campos destacados na conferência." };
  }
  const dados = resultado.data;

  try {
    const pedidosCriados = await prisma.$transaction(async (tx) => {
      const mapaClientes = new Map<string, string>();
      for (const cliente of dados.clientesNovos) {
        const criado = await tx.cliente.create({
          data: { razaoSocial: cliente.texto, telefone: cliente.telefone },
        });
        mapaClientes.set(normalizar(cliente.texto), criado.id);
      }

      let medidaPadraoId: string | undefined;
      const mapaProdutos = new Map<string, { id: string; preco: number; custo: number }>();
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
        mapaProdutos.set(normalizar(produto.texto), {
          id: criado.id,
          preco: Number(criado.preco),
          custo: Number(criado.custo),
        });
      }

      const [clientesExistentes, produtosExistentes] = await Promise.all([
        tx.cliente.findMany({ select: { id: true, razaoSocial: true, nomeFantasia: true } }),
        tx.produto.findMany({ select: { id: true, nome: true, preco: true, custo: true } }),
      ]);

      function resolverCliente(texto: string) {
        const alvo = normalizar(texto);
        if (mapaClientes.has(alvo)) return mapaClientes.get(alvo);
        return clientesExistentes.find(
          (c) => normalizar(c.razaoSocial) === alvo || (c.nomeFantasia && normalizar(c.nomeFantasia) === alvo),
        )?.id;
      }
      function resolverProduto(texto: string) {
        const alvo = normalizar(texto);
        if (mapaProdutos.has(alvo)) return mapaProdutos.get(alvo);
        const achado = produtosExistentes.find((p) => normalizar(p.nome) === alvo);
        return achado ? { id: achado.id, preco: Number(achado.preco), custo: Number(achado.custo) } : undefined;
      }

      const itensPorCliente = new Map<string, typeof dados.itens>();
      for (const item of dados.itens) {
        const lista = itensPorCliente.get(item.clienteTexto) ?? [];
        lista.push(item);
        itensPorCliente.set(item.clienteTexto, lista);
      }

      const criados: PedidoCriado[] = [];
      for (const [clienteTexto, itens] of itensPorCliente) {
        const clienteId = resolverCliente(clienteTexto);
        if (!clienteId) {
          throw new Error(`Cliente "${clienteTexto}" não foi encontrado nem preenchido como novo.`);
        }

        const itensPedido = itens.map((item) => {
          const produto = resolverProduto(item.produtoTexto);
          if (!produto) {
            throw new Error(`Produto "${item.produtoTexto}" não foi encontrado nem preenchido como novo.`);
          }
          return {
            produtoId: produto.id,
            quantidade: item.quantidade,
            precoUnitario: produto.preco,
            custoUnitario: produto.custo,
          };
        });
        const valorTotal = itensPedido.reduce(
          (total, item) => total + item.precoUnitario * item.quantidade,
          0,
        );
        const observacoes = itens
          .map((item) => item.observacao)
          .filter((obs): obs is string => Boolean(obs && obs.trim()))
          .join("; ");

        const pedido = await tx.pedido.create({
          data: {
            clienteId,
            valorTotal,
            observacoes: observacoes || null,
            itens: { create: itensPedido },
          },
        });
        criados.push({
          id: pedido.id,
          numero: pedido.numero,
          clienteNome: clienteTexto,
          itens: itensPedido.length,
        });
      }

      return criados;
    });

    revalidatePath("/pedidos");
    revalidatePath("/clientes");
    revalidatePath("/produtos");
    return { success: true, pedidos: pedidosCriados };
  } catch (erro) {
    return {
      success: false,
      error: erro instanceof Error ? erro.message : "Erro ao importar a planilha.",
    };
  }
}

export async function gerarOPsDosPedidos(pedidoIds: string[]): Promise<{ geradas: number }> {
  const itens = await prisma.itemPedido.findMany({
    where: { pedidoId: { in: pedidoIds }, ordemProducao: null },
    select: { id: true },
  });

  if (itens.length === 0) {
    return { geradas: 0 };
  }

  await prisma.ordemProducao.createMany({
    data: itens.map((item) => ({ itemPedidoId: item.id })),
  });

  revalidatePath("/producao");
  revalidatePath("/pedidos");
  return { geradas: itens.length };
}
