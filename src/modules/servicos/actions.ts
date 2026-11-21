"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";
import { query, queryOne, transaction } from "@/lib/db";
import { requireEscritorio, requireMotorista } from "@/lib/auth";
import { decimalOpc, lerForm, texto, textoOpc, uuidOpc, validar, type EstadoAcao } from "@/lib/form";
import { dataPt, deInputDataHora } from "@/lib/formato";
import { ESTADOS_SERVICO, TRANSICOES, type EstadoServico } from "./estados";

const schemaDados = z.object({
  cliente_id: uuidOpc(),
  descricao_carga: textoOpc(),
  peso_kg: decimalOpc("Peso inválido."),
  origem: texto("Indica a origem."),
  destino: texto("Indica o destino."),
  data_carga: textoOpc(),
  data_entrega: textoOpc(),
  preco: decimalOpc("Preço inválido."),
  notas: textoOpc(),
});

const schemaAtribuicao = z.object({
  trator_id: uuidOpc(),
  reboque_id: uuidOpc(),
  motorista_id: uuidOpc(),
  confirmar_avisos: z.string().optional(),
});

function datas(d: { data_carga?: string; data_entrega?: string }) {
  const carga = deInputDataHora(d.data_carga);
  const entrega = deInputDataHora(d.data_entrega);
  if (d.data_carga && !carga) return { erro: "Data de carga inválida." } as const;
  if (d.data_entrega && !entrega) return { erro: "Data de entrega inválida." } as const;
  if (carga && entrega && entrega < carga) return { erro: "A entrega não pode ser antes da carga." } as const;
  return { carga, entrega } as const;
}

async function registarEvento(
  c: PoolClient,
  empresaId: string,
  servicoId: string,
  tipo: "estado" | "carga" | "entrega" | "incidente" | "nota",
  descricao: string,
  utilizadorId: string,
  local?: string | null
) {
  await c.query(
    `INSERT INTO eventos_servico (empresa_id, servico_id, tipo, descricao, local, utilizador_id)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [empresaId, servicoId, tipo, descricao, local ?? null, utilizadorId]
  );
}

export async function criarServico(_prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  const v = validar(schemaDados, lerForm(fd));
  if (!v.ok) return { erro: v.erro };
  const d = v.dados;
  const dt = datas(d);
  if ("erro" in dt) return { erro: dt.erro };
  if (d.cliente_id) {
    const ok = await queryOne("SELECT 1 FROM clientes WHERE empresa_id=$1 AND id=$2", [u.empresaId, d.cliente_id]);
    if (!ok) return { erro: "Cliente não encontrado." };
  }

  const id = await transaction(async (c) => {
    // Numeração sequencial por empresa, sem colisões entre pedidos simultâneos.
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [u.empresaId]);
    const { rows } = await c.query<{ n: number }>(
      "SELECT COALESCE(max(numero), 0) + 1 AS n FROM servicos WHERE empresa_id = $1",
      [u.empresaId]
    );
    const ins = await c.query<{ id: string }>(
      `INSERT INTO servicos (empresa_id, numero, cliente_id, descricao_carga, peso_kg, origem, destino,
                             data_carga, data_entrega, preco, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [u.empresaId, rows[0]!.n, d.cliente_id ?? null, d.descricao_carga ?? null, d.peso_kg ?? null, d.origem, d.destino,
       dt.carga, dt.entrega, d.preco ?? null, d.notas ?? null]
    );
    const novoId = ins.rows[0]!.id;
    await registarEvento(c, u.empresaId, novoId, "estado", "Serviço criado (Pedido).", u.id);
    return novoId;
  });

  revalidatePath("/servicos");
  revalidatePath("/painel");
  redirect(`/servicos/${id}`);
}

export async function atualizarServico(id: string, _prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  const v = validar(schemaDados, lerForm(fd));
  if (!v.ok) return { erro: v.erro };
  const d = v.dados;
  const dt = datas(d);
  if ("erro" in dt) return { erro: dt.erro };
  if (d.cliente_id) {
    const ok = await queryOne("SELECT 1 FROM clientes WHERE empresa_id=$1 AND id=$2", [u.empresaId, d.cliente_id]);
    if (!ok) return { erro: "Cliente não encontrado." };
  }
  await query(
    `UPDATE servicos SET cliente_id=$3, descricao_carga=$4, peso_kg=$5, origem=$6, destino=$7,
                         data_carga=$8, data_entrega=$9, preco=$10, notas=$11
      WHERE empresa_id=$1 AND id=$2`,
    [u.empresaId, id, d.cliente_id ?? null, d.descricao_carga ?? null, d.peso_kg ?? null, d.origem, d.destino,
     dt.carga, dt.entrega, d.preco ?? null, d.notas ?? null]
  );
  revalidatePath(`/servicos/${id}`);
  revalidatePath("/servicos");
  return { ok: "Serviço atualizado." };
}

/**
 * UC05 — atribuir trator, reboque e motorista. Verifica documentos expirados
 * e sobreposição com outros serviços; avisa e só grava depois de confirmação.
 */
export async function atribuirServico(id: string, _prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  const v = validar(schemaAtribuicao, lerForm(fd));
  if (!v.ok) return { erro: v.erro };
  const d = v.dados;

  const servico = await queryOne<{ data_carga: string | null; data_entrega: string | null; estado: EstadoServico }>(
    "SELECT data_carga, data_entrega, estado FROM servicos WHERE empresa_id=$1 AND id=$2",
    [u.empresaId, id]
  );
  if (!servico) return { erro: "Serviço não encontrado." };
  if (servico.estado === "faturado" || servico.estado === "cancelado") {
    return { erro: "Não é possível alterar a atribuição de um serviço faturado ou cancelado." };
  }

  // Os veículos e o motorista têm de existir na empresa e ser do tipo certo.
  const ids = [d.trator_id, d.reboque_id].filter(Boolean) as string[];
  const veiculos = ids.length
    ? await query<{ id: string; tipo: string; matricula: string; estado: string }>(
        "SELECT id, tipo, matricula, estado FROM veiculos WHERE empresa_id=$1 AND id = ANY($2::uuid[])",
        [u.empresaId, ids]
      )
    : [];
  if (veiculos.length !== ids.length) return { erro: "Veículo não encontrado." };
  const trator = veiculos.find((x) => x.id === d.trator_id);
  const reboque = veiculos.find((x) => x.id === d.reboque_id);
  if (trator && trator.tipo === "reboque") return { erro: `${trator.matricula} é um reboque; escolhe-o no campo Reboque.` };
  if (reboque && reboque.tipo !== "reboque") return { erro: `${reboque.matricula} não é um reboque.` };
  if (d.motorista_id) {
    const ok = await queryOne("SELECT 1 FROM motoristas WHERE empresa_id=$1 AND id=$2", [u.empresaId, d.motorista_id]);
    if (!ok) return { erro: "Motorista não encontrado." };
  }

  const avisos: string[] = [];
  for (const vv of veiculos) {
    if (vv.estado !== "ativo") avisos.push(`${vv.matricula} está ${vv.estado === "oficina" ? "na oficina" : "inativo"}.`);
  }

  // Documentos expirados na data de carga (ou hoje, se não houver data).
  const dataRef = servico.data_carga ?? new Date().toISOString();
  const expirados = await query<{ tipo: string; data_validade: string; matricula: string | null; motorista: string | null }>(
    `SELECT d.tipo, d.data_validade, v.matricula, m.nome AS motorista
       FROM documentos d
       LEFT JOIN veiculos v ON v.id = d.veiculo_id
       LEFT JOIN motoristas m ON m.id = d.motorista_id
      WHERE d.empresa_id = $1
        AND (d.veiculo_id = ANY($2::uuid[]) OR d.motorista_id = $3)
        AND d.data_validade < ($4::timestamptz AT TIME ZONE 'Europe/Lisbon')::date`,
    [u.empresaId, ids, d.motorista_id ?? null, dataRef]
  );
  for (const e of expirados) {
    avisos.push(`${e.tipo} de ${e.matricula ?? e.motorista} expirado em ${dataPt(e.data_validade)}.`);
  }

  // Sobreposição com outros serviços planeados ou em curso.
  if (servico.data_carga) {
    const conflitos = await query<{ numero: number; matricula: string | null; motorista: string | null; trator_id: string | null; reboque_id: string | null; motorista_id: string | null }>(
      `SELECT s.numero, s.trator_id, s.reboque_id, s.motorista_id, t.matricula, m.nome AS motorista
         FROM servicos s
         LEFT JOIN veiculos t ON t.id = s.trator_id
         LEFT JOIN motoristas m ON m.id = s.motorista_id
        WHERE s.empresa_id = $1 AND s.id <> $2
          AND s.estado IN ('planeado','em_curso')
          AND s.data_carga IS NOT NULL
          AND tstzrange(s.data_carga, COALESCE(s.data_entrega, s.data_carga + interval '1 day'))
              && tstzrange($3::timestamptz, COALESCE($4::timestamptz, $3::timestamptz + interval '1 day'))
          AND (s.trator_id = ANY($5::uuid[]) OR s.reboque_id = ANY($5::uuid[]) OR s.motorista_id = $6)`,
      [u.empresaId, id, servico.data_carga, servico.data_entrega, ids, d.motorista_id ?? null]
    );
    for (const c of conflitos) {
      const ref = `S-${String(c.numero).padStart(4, "0")}`;
      if (d.motorista_id && c.motorista_id === d.motorista_id) avisos.push(`${c.motorista} já está no serviço ${ref} nessas datas.`);
      if (ids.some((x) => x === c.trator_id || x === c.reboque_id)) avisos.push(`Um dos veículos já está no serviço ${ref} nessas datas.`);
    }
  }

  if (avisos.length && d.confirmar_avisos !== "sim") {
    return { erro: `Atenção: ${avisos.join(" ")} Marca "Atribuir mesmo assim" para confirmar.` };
  }

  await transaction(async (c) => {
    await c.query(
      "UPDATE servicos SET trator_id=$3, reboque_id=$4, motorista_id=$5 WHERE empresa_id=$1 AND id=$2",
      [u.empresaId, id, d.trator_id ?? null, d.reboque_id ?? null, d.motorista_id ?? null]
    );
    const partes = [trator?.matricula, reboque?.matricula].filter(Boolean).join(" + ");
    await registarEvento(c, u.empresaId, id, "nota", `Atribuição atualizada: ${partes || "sem veículo"}.`, u.id);
  });
  revalidatePath(`/servicos/${id}`);
  revalidatePath("/servicos");
  return { ok: avisos.length ? "Atribuição guardada com avisos." : "Atribuição guardada." };
}

export async function mudarEstado(id: string, novo: EstadoServico, _prev: EstadoAcao, _fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  const s = await queryOne<{ estado: EstadoServico; trator_id: string | null; motorista_id: string | null }>(
    "SELECT estado, trator_id, motorista_id FROM servicos WHERE empresa_id=$1 AND id=$2",
    [u.empresaId, id]
  );
  if (!s) return { erro: "Serviço não encontrado." };
  if (!TRANSICOES[s.estado].includes(novo)) {
    return { erro: `Não é possível passar de ${ESTADOS_SERVICO[s.estado]} para ${ESTADOS_SERVICO[novo]}.` };
  }
  if ((novo === "planeado" || novo === "em_curso") && (!s.trator_id || !s.motorista_id)) {
    return { erro: "Atribui um veículo e um motorista antes de planear o serviço." };
  }
  await transaction(async (c) => {
    await c.query("UPDATE servicos SET estado=$3 WHERE empresa_id=$1 AND id=$2", [u.empresaId, id, novo]);
    await registarEvento(c, u.empresaId, id, "estado", `${ESTADOS_SERVICO[s.estado]} → ${ESTADOS_SERVICO[novo]}.`, u.id);
  });
  revalidatePath(`/servicos/${id}`);
  revalidatePath("/servicos");
  revalidatePath("/painel");
  return { ok: `Estado alterado para ${ESTADOS_SERVICO[novo]}.` };
}

export async function adicionarNota(id: string, _prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  const v = validar(z.object({ descricao: texto("Escreve a nota.") }), lerForm(fd));
  if (!v.ok) return { erro: v.erro };
  const existe = await queryOne("SELECT 1 FROM servicos WHERE empresa_id=$1 AND id=$2", [u.empresaId, id]);
  if (!existe) return { erro: "Serviço não encontrado." };
  await transaction((c) => registarEvento(c, u.empresaId, id, "nota", v.dados.descricao, u.id));
  revalidatePath(`/servicos/${id}`);
  return { ok: "Nota adicionada." };
}

export async function apagarServico(id: string, _prev: EstadoAcao, _fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  const s = await queryOne<{ estado: EstadoServico }>("SELECT estado FROM servicos WHERE empresa_id=$1 AND id=$2", [u.empresaId, id]);
  if (s && s.estado !== "pedido" && s.estado !== "cancelado") {
    return { erro: "Só é possível apagar serviços em Pedido ou Cancelados." };
  }
  await query("DELETE FROM servicos WHERE empresa_id=$1 AND id=$2", [u.empresaId, id]);
  revalidatePath("/servicos");
  redirect("/servicos");
}

/* ---------- Área do motorista (UC06, UC07) ---------- */

async function servicoDoMotorista(empresaId: string, motoristaId: string, id: string) {
  return queryOne<{ estado: EstadoServico }>(
    "SELECT estado FROM servicos WHERE empresa_id=$1 AND id=$2 AND motorista_id=$3",
    [empresaId, id, motoristaId]
  );
}

export async function motoristaRegistar(
  id: string,
  tipo: "carga" | "entrega" | "incidente",
  _prev: EstadoAcao,
  fd: FormData
): Promise<EstadoAcao> {
  const u = await requireMotorista();
  const s = await servicoDoMotorista(u.empresaId, u.motoristaId, id);
  if (!s) return { erro: "Serviço não encontrado." };
  const dados = lerForm(fd);
  const local = dados.local ?? null;
  const descricao = dados.descricao;

  if (tipo === "carga" && s.estado !== "planeado") return { erro: "Este serviço não está à espera de carga." };
  if (tipo === "entrega" && s.estado !== "em_curso") return { erro: "Este serviço não está em curso." };
  if (tipo === "incidente" && !descricao) return { erro: "Descreve o incidente." };

  await transaction(async (c) => {
    if (tipo === "carga") {
      await c.query("UPDATE servicos SET estado='em_curso' WHERE id=$1", [id]);
      await registarEvento(c, u.empresaId, id, "carga", descricao ?? "Carga efetuada.", u.id, local);
    } else if (tipo === "entrega") {
      await c.query("UPDATE servicos SET estado='entregue', data_entrega = COALESCE(data_entrega, now()) WHERE id=$1", [id]);
      await registarEvento(c, u.empresaId, id, "entrega", descricao ?? "Entrega efetuada.", u.id, local);
    } else {
      await registarEvento(c, u.empresaId, id, "incidente", descricao!, u.id, local);
    }
  });
  revalidatePath("/motorista");
  revalidatePath(`/motorista/${id}`);
  revalidatePath(`/servicos/${id}`);
  revalidatePath("/painel");
  const msg = { carga: "Carga registada. Boa viagem!", entrega: "Entrega registada.", incidente: "Incidente comunicado ao escritório." };
  return { ok: msg[tipo] };
}
