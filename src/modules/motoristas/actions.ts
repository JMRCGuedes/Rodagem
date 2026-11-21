"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireEscritorio } from "@/lib/auth";
import { lerForm, texto, textoOpc, validar, type EstadoAcao } from "@/lib/form";

const schema = z.object({
  nome: texto("O nome é obrigatório."),
  nif: textoOpc(),
  telefone: textoOpc(),
  email: z.string().email("Email inválido.").optional(),
  categorias_carta: textoOpc(),
  ativo: z.enum(["sim", "nao"]).default("sim"),
  notas: textoOpc(),
});

export async function criarMotorista(_prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  const v = validar(schema, lerForm(fd));
  if (!v.ok) return { erro: v.erro };
  const d = v.dados;
  const rows = await query<{ id: string }>(
    `INSERT INTO motoristas (empresa_id, nome, nif, telefone, email, categorias_carta, ativo, notas)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [u.empresaId, d.nome, d.nif ?? null, d.telefone ?? null, d.email ?? null, d.categorias_carta ?? null, d.ativo === "sim", d.notas ?? null]
  );
  revalidatePath("/motoristas");
  redirect(`/motoristas/${rows[0]!.id}`);
}

export async function atualizarMotorista(id: string, _prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  const v = validar(schema, lerForm(fd));
  if (!v.ok) return { erro: v.erro };
  const d = v.dados;
  await query(
    `UPDATE motoristas SET nome=$3, nif=$4, telefone=$5, email=$6, categorias_carta=$7, ativo=$8, notas=$9
      WHERE empresa_id=$1 AND id=$2`,
    [u.empresaId, id, d.nome, d.nif ?? null, d.telefone ?? null, d.email ?? null, d.categorias_carta ?? null, d.ativo === "sim", d.notas ?? null]
  );
  revalidatePath(`/motoristas/${id}`);
  revalidatePath("/motoristas");
  return { ok: "Alterações guardadas." };
}

export async function apagarMotorista(id: string, _prev: EstadoAcao, _fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  await query("DELETE FROM motoristas WHERE empresa_id=$1 AND id=$2", [u.empresaId, id]);
  revalidatePath("/motoristas");
  redirect("/motoristas");
}
