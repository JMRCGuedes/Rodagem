"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireEscritorio } from "@/lib/auth";
import { eDuplicado, inteiroOpc, lerForm, texto, textoOpc, validar, type EstadoAcao } from "@/lib/form";

const schema = z.object({
  tipo: z.enum(["trator", "reboque", "rigido", "ligeiro"], { errorMap: () => ({ message: "Escolhe o tipo de veículo." }) }),
  matricula: texto("A matrícula é obrigatória.").transform((m) => m.toUpperCase().replace(/\s+/g, "")),
  marca: textoOpc(),
  modelo: textoOpc(),
  ano: inteiroOpc("Ano inválido."),
  km: inteiroOpc("Quilómetros inválidos."),
  estado: z.enum(["ativo", "oficina", "inativo"]).default("ativo"),
  notas: textoOpc(),
});

export async function criarVeiculo(_prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  const v = validar(schema, lerForm(fd));
  if (!v.ok) return { erro: v.erro };
  const d = v.dados;
  let id: string;
  try {
    const rows = await query<{ id: string }>(
      `INSERT INTO veiculos (empresa_id, tipo, matricula, marca, modelo, ano, km, estado, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [u.empresaId, d.tipo, d.matricula, d.marca ?? null, d.modelo ?? null, d.ano ?? null, d.km ?? null, d.estado, d.notas ?? null]
    );
    id = rows[0]!.id;
  } catch (err) {
    if (eDuplicado(err)) return { erro: `Já existe um veículo com a matrícula ${d.matricula}.` };
    throw err;
  }
  revalidatePath("/frota");
  redirect(`/frota/${id}`);
}

export async function atualizarVeiculo(id: string, _prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  const v = validar(schema, lerForm(fd));
  if (!v.ok) return { erro: v.erro };
  const d = v.dados;
  try {
    await query(
      `UPDATE veiculos SET tipo=$3, matricula=$4, marca=$5, modelo=$6, ano=$7, km=$8, estado=$9, notas=$10
        WHERE empresa_id=$1 AND id=$2`,
      [u.empresaId, id, d.tipo, d.matricula, d.marca ?? null, d.modelo ?? null, d.ano ?? null, d.km ?? null, d.estado, d.notas ?? null]
    );
  } catch (err) {
    if (eDuplicado(err)) return { erro: `Já existe um veículo com a matrícula ${d.matricula}.` };
    throw err;
  }
  revalidatePath(`/frota/${id}`);
  revalidatePath("/frota");
  return { ok: "Alterações guardadas." };
}

export async function apagarVeiculo(id: string, _prev: EstadoAcao, _fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  await query("DELETE FROM veiculos WHERE empresa_id=$1 AND id=$2", [u.empresaId, id]);
  revalidatePath("/frota");
  redirect("/frota");
}
