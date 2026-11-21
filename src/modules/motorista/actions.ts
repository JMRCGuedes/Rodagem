"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { queryOne, transaction } from "@/lib/db";
import { requireMotorista } from "@/lib/auth";
import { lerForm, type EstadoAcao } from "@/lib/form";
import { registarEvento } from "@/modules/servicos/eventos";

const UUID = /^[0-9a-f-]{36}$/;
const MAX_FOTOS = 4;
const MAX_BYTES_FOTO = 1_500_000;
const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"];

async function servicoDoMotorista(empresaId: string, motoristaId: string, id: string) {
  if (!UUID.test(id)) return null;
  return queryOne<{ estado: string; numero: number }>(
    "SELECT estado, numero FROM servicos WHERE empresa_id=$1 AND id=$2 AND motorista_id=$3",
    [empresaId, id, motoristaId]
  );
}

function revalidar(id: string) {
  revalidatePath("/motorista");
  revalidatePath(`/motorista/${id}`);
  revalidatePath(`/servicos/${id}`);
  revalidatePath("/planeamento");
  revalidatePath("/painel");
}

/** "Carreguei, vou a caminho". */
export async function marcarCarga(id: string, _prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireMotorista();
  const s = await servicoDoMotorista(u.empresaId, u.motoristaId, id);
  if (!s) return { erro: "Serviço não encontrado." };
  if (s.estado !== "planeado") return { erro: "Este serviço já não está à espera de carga." };
  const dados = lerForm(fd);
  await transaction(async (c) => {
    await c.query("UPDATE servicos SET estado='em_curso' WHERE id=$1", [id]);
    await registarEvento(c, {
      empresaId: u.empresaId,
      servicoId: id,
      tipo: "carga",
      descricao: dados.descricao ?? "Carga feita, a caminho.",
      utilizadorId: u.id,
      local: dados.local ?? null,
    });
  });
  revalidar(id);
  return { ok: "Carga registada. Boa viagem!" };
}

/** "Vou atrasar". */
export async function avisarAtraso(id: string, _prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireMotorista();
  const s = await servicoDoMotorista(u.empresaId, u.motoristaId, id);
  if (!s) return { erro: "Serviço não encontrado." };
  const dados = lerForm(fd);
  const minutos = Number(dados.minutos);
  if (![30, 60, 120, 240].includes(minutos)) return { erro: "Escolhe quanto tempo de atraso." };
  const texto = `Atraso previsto de ${minutos >= 60 ? `${minutos / 60} h` : `${minutos} min`}${dados.motivo ? `: ${dados.motivo}` : "."}`;
  await transaction((c) =>
    registarEvento(c, { empresaId: u.empresaId, servicoId: id, tipo: "atraso", descricao: texto, utilizadorId: u.id })
  );
  revalidar(id);
  return { ok: "O escritório foi avisado do atraso." };
}

/** "Problema": avaria, acidente, carga recusada… */
export async function comunicarProblema(id: string, _prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireMotorista();
  const s = await servicoDoMotorista(u.empresaId, u.motoristaId, id);
  if (!s) return { erro: "Serviço não encontrado." };
  const dados = lerForm(fd);
  if (!dados.descricao) return { erro: "Descreve o problema." };
  const tipo = dados.tipo_problema ? `${dados.tipo_problema}: ` : "";
  await transaction((c) =>
    registarEvento(c, {
      empresaId: u.empresaId,
      servicoId: id,
      tipo: "incidente",
      descricao: `${tipo}${dados.descricao}`,
      utilizadorId: u.id,
      local: dados.local ?? null,
    })
  );
  revalidar(id);
  return { ok: "Problema comunicado ao escritório." };
}

/** Registar a entrega com a foto da guia (CMR) assinada. As fotos chegam já reduzidas pelo telemóvel. */
export async function registarEntrega(id: string, _prev: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await requireMotorista();
  const s = await servicoDoMotorista(u.empresaId, u.motoristaId, id);
  if (!s) return { erro: "Serviço não encontrado." };
  if (s.estado !== "em_curso") return { erro: "Este serviço não está em curso." };

  const dados = lerForm(fd);
  const fotos = fd.getAll("fotos").filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (!fotos.length) return { erro: "Tira uma foto da guia assinada." };
  if (fotos.length > MAX_FOTOS) return { erro: `No máximo ${MAX_FOTOS} fotos.` };
  for (const f of fotos) {
    if (!TIPOS_IMAGEM.includes(f.type)) return { erro: "As fotos têm de ser imagens (JPEG ou PNG)." };
    if (f.size > MAX_BYTES_FOTO) return { erro: "Uma das fotos é demasiado grande." };
  }
  const reservas = dados.reservas === "sim";
  if (reservas && !dados.observacoes) return { erro: "Descreve as reservas indicadas na guia." };

  const buffers = await Promise.all(fotos.map(async (f) => ({ mime: f.type, dados: Buffer.from(await f.arrayBuffer()) })));

  await transaction(async (c) => {
    await c.query("UPDATE servicos SET estado='entregue', data_entrega = now() WHERE id=$1", [id]);
    const eventoId = await registarEvento(c, {
      empresaId: u.empresaId,
      servicoId: id,
      tipo: "entrega",
      descricao: [reservas ? "Entregue com reservas." : "Entregue sem reservas.", dados.observacoes].filter(Boolean).join(" "),
      utilizadorId: u.id,
      recebidoPor: dados.recebido_por ?? null,
      comReservas: reservas,
    });
    for (const b of buffers) {
      await c.query(
        `INSERT INTO anexos (empresa_id, servico_id, evento_id, tipo, mime, tamanho, dados, utilizador_id)
         VALUES ($1,$2,$3,'guia',$4,$5,$6,$7)`,
        [u.empresaId, id, eventoId, b.mime, b.dados.length, b.dados, u.id]
      );
    }
  });
  revalidar(id);
  redirect(`/motorista?entregue=${s.numero}`);
}
