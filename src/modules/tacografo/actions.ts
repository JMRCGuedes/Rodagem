"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { requireEscritorio } from "@/lib/auth";
import { hojeLisboa } from "@/lib/formato";
import { lerForm, textoOpc, validar, type EstadoAcao } from "@/lib/form";

const schema = z.object({
  // valor do select: "cartao:<uuid>" ou "veiculo:<uuid>"
  alvo: z.string({ required_error: "Escolhe o motorista ou o veículo." }).regex(/^(cartao|veiculo):[0-9a-f-]{36}$/, "Escolhe o motorista ou o veículo."),
  data: z.string({ required_error: "Indica a data da descarga." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  notas: textoOpc(),
});

export async function registarDescarga(_prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireEscritorio();
  const v = validar(schema, lerForm(fd));
  if (!v.ok) return { erro: v.erro };
  const { alvo, data, notas } = v.dados;
  if (data > hojeLisboa()) return { erro: "A data da descarga não pode ser no futuro." };

  const [origem, id] = alvo.split(":") as ["cartao" | "veiculo", string];
  const tabela = origem === "cartao" ? "motoristas" : "veiculos";
  const existe = await queryOne(`SELECT 1 FROM ${tabela} WHERE empresa_id=$1 AND id=$2`, [u.empresaId, id]);
  if (!existe) return { erro: "Registo não encontrado." };

  await query(
    `INSERT INTO descargas_tacografo (empresa_id, origem, motorista_id, veiculo_id, data, notas, utilizador_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [u.empresaId, origem, origem === "cartao" ? id : null, origem === "veiculo" ? id : null, data, notas ?? null, u.id]
  );
  revalidatePath("/tacografo");
  revalidatePath("/painel");
  revalidatePath("/alertas");
  return { ok: "Descarga registada." };
}
