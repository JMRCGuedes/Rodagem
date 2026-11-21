import "server-only";
import { query } from "@/lib/db";
import { dataPt } from "@/lib/formato";
import { referencia } from "./estados";

/**
 * Avisos antes de atribuir veículos e motorista a um serviço:
 * veículos fora de serviço, documentos expirados na data de carga e sobreposição com outros serviços.
 * Partilhado pela página do serviço e pelo quadro de planeamento.
 */
export async function avisosAtribuicao(p: {
  empresaId: string;
  servicoId: string;
  veiculoIds: string[];
  motoristaId: string | null;
  dataCarga: string | Date | null;
  dataEntrega: string | Date | null;
}): Promise<string[]> {
  const avisos: string[] = [];
  const ids = p.veiculoIds.filter(Boolean);

  if (ids.length) {
    const veiculos = await query<{ matricula: string; estado: string }>(
      "SELECT matricula, estado FROM veiculos WHERE empresa_id=$1 AND id = ANY($2::uuid[])",
      [p.empresaId, ids]
    );
    for (const v of veiculos) {
      if (v.estado !== "ativo") avisos.push(`${v.matricula} está ${v.estado === "oficina" ? "na oficina" : "inativo"}.`);
    }
  }

  const dataRef = p.dataCarga ?? new Date().toISOString();
  const expirados = await query<{ tipo: string; data_validade: string; matricula: string | null; motorista: string | null }>(
    `SELECT d.tipo, d.data_validade, v.matricula, m.nome AS motorista
       FROM documentos d
       LEFT JOIN veiculos v ON v.id = d.veiculo_id
       LEFT JOIN motoristas m ON m.id = d.motorista_id
      WHERE d.empresa_id = $1
        AND (d.veiculo_id = ANY($2::uuid[]) OR d.motorista_id = $3)
        AND d.data_validade < ($4::timestamptz AT TIME ZONE 'Europe/Lisbon')::date`,
    [p.empresaId, ids, p.motoristaId, dataRef]
  );
  for (const e of expirados) {
    avisos.push(`${e.tipo} de ${e.matricula ?? e.motorista} expirado em ${dataPt(e.data_validade)}.`);
  }

  if (p.dataCarga) {
    const conflitos = await query<{
      numero: number;
      motorista: string | null;
      trator_id: string | null;
      reboque_id: string | null;
      motorista_id: string | null;
    }>(
      `SELECT s.numero, s.trator_id, s.reboque_id, s.motorista_id, m.nome AS motorista
         FROM servicos s
         LEFT JOIN motoristas m ON m.id = s.motorista_id
        WHERE s.empresa_id = $1 AND s.id <> $2
          AND s.estado IN ('planeado','em_curso')
          AND s.data_carga IS NOT NULL
          AND tstzrange(s.data_carga, COALESCE(s.data_entrega, s.data_carga + interval '1 day'))
              && tstzrange($3::timestamptz, COALESCE($4::timestamptz, $3::timestamptz + interval '1 day'))
          AND (s.trator_id = ANY($5::uuid[]) OR s.reboque_id = ANY($5::uuid[]) OR s.motorista_id = $6)`,
      [p.empresaId, p.servicoId, p.dataCarga, p.dataEntrega, ids, p.motoristaId]
    );
    for (const c of conflitos) {
      const ref = referencia(c.numero);
      if (p.motoristaId && c.motorista_id === p.motoristaId) avisos.push(`${c.motorista} já está no serviço ${ref} nessas datas.`);
      if (ids.some((x) => x === c.trator_id || x === c.reboque_id)) avisos.push(`Um dos veículos já está no serviço ${ref} nessas datas.`);
    }
  }
  return avisos;
}
