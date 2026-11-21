"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { requireEscritorio } from "@/lib/auth";
import { dataOpc, lerForm, texto, textoOpc, uuidOpc, validar, type EstadoAcao } from "@/lib/form";

const schema = z.object({
  veiculo_id: uuidOpc(),
  motorista_id: uuidOpc(),
  tipo: texto("Escolhe o tipo de documento."),
  tipo_outro: textoOpc(),
  numero: textoOpc(),
  data_emissao: dataOpc(),
  data_validade: dataOpc(),
  notas: textoOpc(),
  voltar: textoOpc(),
});

function caminhoDono(d: { veiculo_id?: string; motorista_id?: string }) {
  if (d.veiculo_id) return `/frota/${d.veiculo_id}`;
  if (d.motorista_id) return `/motoristas/${d.motorista_id}`;
  return "/empresa";
}

export async function criarDocumento(_prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  const v = validar(schema, lerForm(fd));
  if (!v.ok) return { erro: v.erro };
  const d = v.dados;
  const tipo = d.tipo === "Outro" && d.tipo_outro ? d.tipo_outro : d.tipo;

  // O dono do documento tem de pertencer à mesma empresa.
  if (d.veiculo_id) {
    const ok = await queryOne("SELECT 1 FROM veiculos WHERE empresa_id=$1 AND id=$2", [u.empresaId, d.veiculo_id]);
    if (!ok) return { erro: "Veículo não encontrado." };
  }
  if (d.motorista_id) {
    const ok = await queryOne("SELECT 1 FROM motoristas WHERE empresa_id=$1 AND id=$2", [u.empresaId, d.motorista_id]);
    if (!ok) return { erro: "Motorista não encontrado." };
  }
  if (d.data_emissao && d.data_validade && d.data_validade < d.data_emissao) {
    return { erro: "A validade não pode ser anterior à emissão." };
  }

  await query(
    `INSERT INTO documentos (empresa_id, veiculo_id, motorista_id, tipo, numero, data_emissao, data_validade, notas)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [u.empresaId, d.veiculo_id ?? null, d.motorista_id ?? null, tipo, d.numero ?? null, d.data_emissao ?? null, d.data_validade ?? null, d.notas ?? null]
  );
  revalidatePath(caminhoDono(d));
  revalidatePath("/painel");
  revalidatePath("/alertas");
  return { ok: `${tipo} adicionado.` };
}

/** Renovar = substituir número e datas de um documento existente. */
export async function renovarDocumento(id: string, _prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  const v = validar(
    z.object({ numero: textoOpc(), data_emissao: dataOpc(), data_validade: dataOpc() }),
    lerForm(fd)
  );
  if (!v.ok) return { erro: v.erro };
  const d = v.dados;
  const doc = await queryOne<{ veiculo_id: string | null; motorista_id: string | null }>(
    `UPDATE documentos SET numero = COALESCE($3, numero), data_emissao = $4, data_validade = $5
      WHERE empresa_id=$1 AND id=$2 RETURNING veiculo_id, motorista_id`,
    [u.empresaId, id, d.numero ?? null, d.data_emissao ?? null, d.data_validade ?? null]
  );
  if (!doc) return { erro: "Documento não encontrado." };
  revalidatePath(caminhoDono({ veiculo_id: doc.veiculo_id ?? undefined, motorista_id: doc.motorista_id ?? undefined }));
  revalidatePath("/painel");
  revalidatePath("/alertas");
  return { ok: "Documento renovado." };
}

export async function apagarDocumento(id: string, _prev: EstadoAcao, _fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  const doc = await queryOne<{ veiculo_id: string | null; motorista_id: string | null }>(
    "DELETE FROM documentos WHERE empresa_id=$1 AND id=$2 RETURNING veiculo_id, motorista_id",
    [u.empresaId, id]
  );
  if (doc) revalidatePath(caminhoDono({ veiculo_id: doc.veiculo_id ?? undefined, motorista_id: doc.motorista_id ?? undefined }));
  revalidatePath("/alertas");
  return { ok: "Documento apagado." };
}
