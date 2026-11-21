"use server";

import { revalidatePath } from "next/cache";
import { queryOne, transaction } from "@/lib/db";
import { requireEscritorio } from "@/lib/auth";
import { diaHoraLisboa, diaLisboa } from "@/lib/datas";
import { avisosAtribuicao } from "@/modules/servicos/verificacoes";
import { registarEvento } from "@/modules/servicos/eventos";

export type ResultadoQuadro = { ok?: string; erro?: string; avisos?: string[] };

const UUID = /^[0-9a-f-]{36}$/;

/**
 * Atribuir um serviço a um camião a partir do quadro (arrastar e largar, sugestão ou menu).
 * O motorista é o habitual do camião, se houver; senão mantém-se o que o serviço já tinha.
 * Com `dia`, a carga passa para esse dia (mantendo a hora e a duração).
 * Se houver avisos e `forcar` for falso, não grava e devolve os avisos para confirmação.
 */
export async function atribuirNoQuadro(servicoId: string, veiculoId: string, dia: string | null, forcar: boolean): Promise<ResultadoQuadro> {
  const u = await requireEscritorio();
  if (!UUID.test(servicoId) || !UUID.test(veiculoId)) return { erro: "Pedido inválido." };
  if (dia !== null && !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return { erro: "Dia inválido." };

  const s = await queryOne<{ estado: string; data_carga: string | null; data_entrega: string | null; motorista_id: string | null; numero: number }>(
    "SELECT estado, data_carga, data_entrega, motorista_id, numero FROM servicos WHERE empresa_id=$1 AND id=$2",
    [u.empresaId, servicoId]
  );
  if (!s) return { erro: "Serviço não encontrado." };
  if (s.estado !== "pedido" && s.estado !== "planeado") return { erro: "Só se replaneiam serviços em Pedido ou Planeado." };

  const v = await queryOne<{ matricula: string; tipo: string; motorista_habitual_id: string | null }>(
    "SELECT matricula, tipo, motorista_habitual_id FROM veiculos WHERE empresa_id=$1 AND id=$2",
    [u.empresaId, veiculoId]
  );
  if (!v) return { erro: "Veículo não encontrado." };
  if (v.tipo === "reboque") return { erro: "Arrasta para um trator ou rígido; o reboque escolhe-se no serviço." };

  const motoristaId = v.motorista_habitual_id ?? s.motorista_id;

  // Nova data de carga (e entrega, deslocada pela mesma diferença).
  let carga: Date | null = s.data_carga ? new Date(s.data_carga) : null;
  let entrega: Date | null = s.data_entrega ? new Date(s.data_entrega) : null;
  if (dia) {
    const diaAtual = carga ? diaLisboa(carga) : null;
    if (diaAtual !== dia) {
      const hora = carga
        ? Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", hour: "2-digit", hour12: false }).format(carga))
        : 8;
      const novaCarga = diaHoraLisboa(dia, hora);
      if (entrega && carga) entrega = new Date(entrega.getTime() + (novaCarga.getTime() - carga.getTime()));
      else if (entrega && diaLisboa(entrega) < dia) entrega = null;
      carga = novaCarga;
    }
  }

  const avisos = await avisosAtribuicao({
    empresaId: u.empresaId,
    servicoId,
    veiculoIds: [veiculoId],
    motoristaId,
    dataCarga: carga,
    dataEntrega: entrega,
  });
  if (avisos.length && !forcar) return { avisos };

  const novoEstado = motoristaId ? "planeado" : s.estado;
  await transaction(async (c) => {
    await c.query(
      `UPDATE servicos SET trator_id=$3, motorista_id=$4, data_carga=$5, data_entrega=$6, estado=$7
        WHERE empresa_id=$1 AND id=$2`,
      [u.empresaId, servicoId, veiculoId, motoristaId, carga, entrega, novoEstado]
    );
    const quando = dia && carga ? ` para ${diaLisboa(carga).split("-").reverse().join("/")}` : "";
    await registarEvento(c, {
      empresaId: u.empresaId,
      servicoId,
      tipo: "estado",
      descricao: `Planeado no quadro: ${v.matricula}${quando}${avisos.length ? " (com avisos)" : ""}.`,
      utilizadorId: u.id,
    });
  });

  revalidatePath("/planeamento");
  revalidatePath("/servicos");
  revalidatePath("/painel");
  return {
    ok: motoristaId
      ? `S-${String(s.numero).padStart(4, "0")} planeado em ${v.matricula}.`
      : `S-${String(s.numero).padStart(4, "0")} atribuído a ${v.matricula}; falta escolher o motorista.`,
  };
}

/** Tirar um serviço planeado do camião (volta a Pedido). */
export async function desatribuirNoQuadro(servicoId: string): Promise<ResultadoQuadro> {
  const u = await requireEscritorio();
  if (!UUID.test(servicoId)) return { erro: "Pedido inválido." };
  const s = await queryOne<{ estado: string }>("SELECT estado FROM servicos WHERE empresa_id=$1 AND id=$2", [u.empresaId, servicoId]);
  if (!s) return { erro: "Serviço não encontrado." };
  if (s.estado !== "planeado") return { erro: "Só se tiram do quadro serviços planeados." };
  await transaction(async (c) => {
    await c.query("UPDATE servicos SET estado='pedido', trator_id=NULL WHERE empresa_id=$1 AND id=$2", [u.empresaId, servicoId]);
    await registarEvento(c, { empresaId: u.empresaId, servicoId, tipo: "estado", descricao: "Retirado do quadro (Pedido).", utilizadorId: u.id });
  });
  revalidatePath("/planeamento");
  revalidatePath("/servicos");
  return { ok: "Serviço voltou a Por planear." };
}
