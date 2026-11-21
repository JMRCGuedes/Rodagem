"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireEscritorio } from "@/lib/auth";
import { lerForm, texto, textoOpc, validar, type EstadoAcao } from "@/lib/form";

const schema = z.object({
  nome: texto("O nome do cliente é obrigatório."),
  nif: textoOpc(),
  contacto: textoOpc(),
  telefone: textoOpc(),
  email: z.string().email("Email inválido.").optional(),
  morada: textoOpc(),
  notas: textoOpc(),
});

function params(d: z.infer<typeof schema>) {
  return [d.nome, d.nif ?? null, d.contacto ?? null, d.telefone ?? null, d.email ?? null, d.morada ?? null, d.notas ?? null];
}

export async function criarCliente(_prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  const v = validar(schema, lerForm(fd));
  if (!v.ok) return { erro: v.erro };
  await query(
    `INSERT INTO clientes (empresa_id, nome, nif, contacto, telefone, email, morada, notas)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [u.empresaId, ...params(v.dados)]
  );
  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function atualizarCliente(id: string, _prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  const v = validar(schema, lerForm(fd));
  if (!v.ok) return { erro: v.erro };
  await query(
    `UPDATE clientes SET nome=$3, nif=$4, contacto=$5, telefone=$6, email=$7, morada=$8, notas=$9
      WHERE empresa_id=$1 AND id=$2`,
    [u.empresaId, id, ...params(v.dados)]
  );
  revalidatePath("/clientes");
  return { ok: "Alterações guardadas." };
}

export async function apagarCliente(id: string, _prev: EstadoAcao, _fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  await query("DELETE FROM clientes WHERE empresa_id=$1 AND id=$2", [u.empresaId, id]);
  revalidatePath("/clientes");
  redirect("/clientes");
}
