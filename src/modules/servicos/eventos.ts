import "server-only";
import type { PoolClient } from "pg";

export type TipoEvento = "estado" | "carga" | "entrega" | "incidente" | "atraso" | "nota";

export async function registarEvento(
  c: PoolClient,
  e: {
    empresaId: string;
    servicoId: string;
    tipo: TipoEvento;
    descricao: string;
    utilizadorId: string;
    local?: string | null;
    recebidoPor?: string | null;
    comReservas?: boolean | null;
  }
): Promise<string> {
  const r = await c.query<{ id: string }>(
    `INSERT INTO eventos_servico (empresa_id, servico_id, tipo, descricao, local, utilizador_id, recebido_por, com_reservas)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [e.empresaId, e.servicoId, e.tipo, e.descricao, e.local ?? null, e.utilizadorId, e.recebidoPor ?? null, e.comReservas ?? null]
  );
  return r.rows[0]!.id;
}
