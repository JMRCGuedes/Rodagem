"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query, queryOne, transaction } from "@/lib/db";
import { requireEscritorio } from "@/lib/auth";
import { dataOpc, decimalOpc, lerForm, texto, textoOpc, validar, type EstadoAcao } from "@/lib/form";
import { extrairOferta, iaConfigurada, type OfertaExtraida } from "@/lib/ia";
import { kmEntre } from "@/lib/geo";
import { diaHoraLisboa } from "@/lib/datas";
import { hojeISO } from "@/modules/planeamento/util";
import { registarEvento } from "@/modules/servicos/eventos";
import type { EstadoOferta } from "./queries";

const UUID = /^[0-9a-f-]{36}$/;
const CARROC = ["lona", "frigorifico", "caixa", "cisterna", "porta_contentores", "basculante", "plataforma", "outro"] as const;

/** Passo 1 (opcional): a IA lê o texto ou a captura de ecrã e devolve os campos para confirmar. */
export async function analisarComIA(
  textoOferta: string,
  imagem: { mime: string; base64: string } | null
): Promise<{ erro?: string; dados?: OfertaExtraida }> {
  await requireEscritorio();
  if (!iaConfigurada()) return { erro: "A IA não está ligada. Preenche os campos à mão." };
  if (!textoOferta.trim() && !imagem) return { erro: "Cola o texto da oferta ou escolhe uma captura de ecrã." };
  if (imagem && (!["image/png", "image/jpeg", "image/webp"].includes(imagem.mime) || imagem.base64.length > 6_000_000)) {
    return { erro: "Imagem inválida ou demasiado grande." };
  }
  try {
    const dados = await extrairOferta(textoOferta, imagem ?? undefined, hojeISO());
    if (!dados.origem && !dados.destino) return { erro: "Não encontrei origem nem destino nesta oferta." };
    return { dados };
  } catch (err) {
    console.error("[ia] erro a analisar oferta:", err);
    return { erro: "A análise automática falhou. Preenche os campos à mão ou tenta outra vez." };
  }
}

const schemaOferta = z.object({
  origem: texto("Indica a origem."),
  destino: texto("Indica o destino."),
  data_carga: dataOpc(),
  data_entrega: dataOpc(),
  peso_kg: decimalOpc("Peso inválido."),
  descricao_carga: textoOpc(),
  carrocaria: z.enum(CARROC).optional(),
  preco: decimalOpc("Preço inválido."),
  empresa_anunciante: textoOpc(),
  contacto_nome: textoOpc(),
  contacto_telefone: textoOpc(),
  contacto_email: z.string().email("Email inválido.").optional(),
  idioma: z.enum(["pt", "es", "fr", "en"]).default("pt"),
  fonte: z.enum(["wtransnet", "teleroute", "direto", "outro"]).default("wtransnet"),
  texto_original: textoOpc(),
  notas: textoOpc(),
});

/** Passo 2: guardar a oferta (vinda da IA e revista, ou preenchida à mão). */
export async function criarOferta(_prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  const v = validar(schemaOferta, lerForm(fd));
  if (!v.ok) return { erro: v.erro };
  const d = v.dados;
  if (d.data_carga && d.data_entrega && d.data_entrega < d.data_carga) return { erro: "A entrega não pode ser antes da carga." };

  const km = await kmEntre(d.origem, d.destino);
  const rows = await query<{ id: string }>(
    `INSERT INTO ofertas (empresa_id, fonte, origem, destino, data_carga, data_entrega, peso_kg, descricao_carga, carrocaria, preco,
                          empresa_anunciante, contacto_nome, contacto_telefone, contacto_email, idioma, km, texto_original, notas, utilizador_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
    [
      u.empresaId, d.fonte, d.origem, d.destino, d.data_carga ?? null, d.data_entrega ?? null, d.peso_kg ?? null,
      d.descricao_carga ?? null, d.carrocaria ?? null, d.preco ?? null, d.empresa_anunciante ?? null, d.contacto_nome ?? null,
      d.contacto_telefone ?? null, d.contacto_email ?? null, d.idioma, km, d.texto_original?.slice(0, 8000) ?? null, d.notas ?? null, u.id,
    ]
  );
  revalidatePath("/cargas");
  redirect(`/cargas/${rows[0]!.id}`);
}

const TRANSICOES: Record<EstadoOferta, EstadoOferta[]> = {
  nova: ["contactada", "proposta", "descartada"],
  contactada: ["proposta", "descartada", "nova"],
  proposta: ["descartada", "contactada"],
  aceite: [],
  descartada: ["nova"],
};

export async function mudarEstadoOferta(id: string, novo: EstadoOferta, _prev: EstadoAcao, _fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  if (!UUID.test(id)) return { erro: "Oferta inválida." };
  const o = await queryOne<{ estado: EstadoOferta }>("SELECT estado FROM ofertas WHERE empresa_id=$1 AND id=$2", [u.empresaId, id]);
  if (!o) return { erro: "Oferta não encontrada." };
  if (!TRANSICOES[o.estado].includes(novo)) return { erro: "Mudança de estado não permitida." };
  await query("UPDATE ofertas SET estado=$3, atualizado_em=now() WHERE empresa_id=$1 AND id=$2", [u.empresaId, id, novo]);
  revalidatePath("/cargas");
  revalidatePath(`/cargas/${id}`);
  return { ok: "Estado atualizado." };
}

export async function guardarNotasOferta(id: string, _prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  if (!UUID.test(id)) return { erro: "Oferta inválida." };
  const d = lerForm(fd);
  const preco = d.preco ? Number(d.preco.replace(",", ".")) : null;
  if (preco !== null && (!Number.isFinite(preco) || preco < 0)) return { erro: "Preço inválido." };
  await query("UPDATE ofertas SET notas=$3, preco=COALESCE($4, preco), atualizado_em=now() WHERE empresa_id=$1 AND id=$2", [
    u.empresaId,
    id,
    d.notas ?? null,
    preco,
  ]);
  revalidatePath(`/cargas/${id}`);
  revalidatePath("/cargas");
  return { ok: "Guardado." };
}

/**
 * A carga foi fechada: cria o serviço (e o cliente, se ainda não existir) e, se foi escolhido um camião,
 * deixa-o já planeado com o motorista habitual.
 */
export async function aceitarOferta(id: string, _prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  if (!UUID.test(id)) return { erro: "Oferta inválida." };
  const o = await queryOne<{
    estado: EstadoOferta; origem: string; destino: string; data_carga: string | null; data_entrega: string | null;
    peso_kg: string | null; descricao_carga: string | null; carrocaria: string | null; preco: string | null;
    empresa_anunciante: string | null; contacto_nome: string | null; contacto_telefone: string | null; contacto_email: string | null;
  }>(
    `SELECT estado, origem, destino, data_carga, data_entrega, peso_kg, descricao_carga, carrocaria, preco,
            empresa_anunciante, contacto_nome, contacto_telefone, contacto_email
       FROM ofertas WHERE empresa_id=$1 AND id=$2`,
    [u.empresaId, id]
  );
  if (!o) return { erro: "Oferta não encontrada." };
  if (o.estado === "aceite") return { erro: "Esta oferta já foi aceite." };

  const dados = lerForm(fd);
  const preco = dados.preco ? Number(dados.preco.replace(",", ".")) : o.preco !== null ? Number(o.preco) : null;
  if (preco !== null && (!Number.isFinite(preco) || preco < 0)) return { erro: "Preço inválido." };
  const veiculoId = dados.veiculo_id && UUID.test(dados.veiculo_id) ? dados.veiculo_id : null;
  const veiculo = veiculoId
    ? await queryOne<{ tipo: string; motorista_habitual_id: string | null }>(
        "SELECT tipo, motorista_habitual_id FROM veiculos WHERE empresa_id=$1 AND id=$2",
        [u.empresaId, veiculoId]
      )
    : null;
  if (veiculoId && (!veiculo || veiculo.tipo === "reboque")) return { erro: "Escolhe um trator ou rígido." };

  const servicoId = await transaction(async (c) => {
    // Cliente: reaproveita pelo nome, senão cria.
    let clienteId: string | null = null;
    if (o.empresa_anunciante) {
      const existente = await c.query<{ id: string }>(
        "SELECT id FROM clientes WHERE empresa_id=$1 AND lower(nome)=lower($2) LIMIT 1",
        [u.empresaId, o.empresa_anunciante]
      );
      clienteId =
        existente.rows[0]?.id ??
        (
          await c.query<{ id: string }>(
            "INSERT INTO clientes (empresa_id, nome, contacto, telefone, email) VALUES ($1,$2,$3,$4,$5) RETURNING id",
            [u.empresaId, o.empresa_anunciante, o.contacto_nome, o.contacto_telefone, o.contacto_email]
          )
        ).rows[0]!.id;
    }

    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [u.empresaId]);
    const { rows } = await c.query<{ n: number }>("SELECT COALESCE(max(numero), 0) + 1 AS n FROM servicos WHERE empresa_id=$1", [u.empresaId]);
    const motoristaId = veiculo?.motorista_habitual_id ?? null;
    const estado = veiculoId && motoristaId ? "planeado" : "pedido";
    const ins = await c.query<{ id: string }>(
      `INSERT INTO servicos (empresa_id, numero, cliente_id, descricao_carga, peso_kg, origem, destino, data_carga, data_entrega,
                             preco, carrocaria, contacto_carga, estado, trator_id, motorista_id, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [
        u.empresaId, rows[0]!.n, clienteId, o.descricao_carga, o.peso_kg, o.origem, o.destino,
        o.data_carga ? diaHoraLisboa(o.data_carga, 8) : null,
        o.data_entrega ? diaHoraLisboa(o.data_entrega, 12) : null,
        preco, o.carrocaria, o.contacto_telefone, estado, veiculoId, motoristaId,
        o.contacto_nome ? `Contacto: ${o.contacto_nome}${o.contacto_telefone ? ` (${o.contacto_telefone})` : ""}` : null,
      ]
    );
    const novoId = ins.rows[0]!.id;
    await registarEvento(c, {
      empresaId: u.empresaId,
      servicoId: novoId,
      tipo: "estado",
      descricao: `Criado a partir de uma oferta aceite${estado === "planeado" ? " e já planeado" : ""}.`,
      utilizadorId: u.id,
    });
    await c.query("UPDATE ofertas SET estado='aceite', servico_id=$3, preco=$4, atualizado_em=now() WHERE empresa_id=$1 AND id=$2", [
      u.empresaId,
      id,
      novoId,
      preco,
    ]);
    return novoId;
  });

  revalidatePath("/cargas");
  revalidatePath("/servicos");
  revalidatePath("/planeamento");
  redirect(`/servicos/${servicoId}`);
}

export async function apagarOferta(id: string, _prev: EstadoAcao, _fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  if (!UUID.test(id)) return { erro: "Oferta inválida." };
  await query("DELETE FROM ofertas WHERE empresa_id=$1 AND id=$2 AND estado <> 'aceite'", [u.empresaId, id]);
  revalidatePath("/cargas");
  redirect("/cargas");
}
