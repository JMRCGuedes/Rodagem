import "server-only";
import { query, queryOne } from "@/lib/db";
import type { EstadoServico } from "./estados";

export type ServicoLinha = {
  id: string;
  numero: number;
  estado: EstadoServico;
  origem: string;
  destino: string;
  descricao_carga: string | null;
  peso_kg: string | null;
  data_carga: string | null;
  data_entrega: string | null;
  preco: string | null;
  notas: string | null;
  morada_carga: string | null;
  morada_entrega: string | null;
  contacto_carga: string | null;
  contacto_entrega: string | null;
  referencia_cliente: string | null;
  carrocaria: string | null;
  cliente_id: string | null;
  cliente: string | null;
  trator_id: string | null;
  trator: string | null;
  reboque_id: string | null;
  reboque: string | null;
  motorista_id: string | null;
  motorista: string | null;
};

const SELECT = `
  SELECT s.id, s.numero, s.estado, s.origem, s.destino, s.descricao_carga, s.peso_kg,
         s.data_carga, s.data_entrega, s.preco, s.notas,
         s.morada_carga, s.morada_entrega, s.contacto_carga, s.contacto_entrega, s.referencia_cliente, s.carrocaria,
         s.cliente_id, c.nome AS cliente,
         s.trator_id, t.matricula AS trator,
         s.reboque_id, r.matricula AS reboque,
         s.motorista_id, m.nome AS motorista
    FROM servicos s
    LEFT JOIN clientes c ON c.id = s.cliente_id
    LEFT JOIN veiculos t ON t.id = s.trator_id
    LEFT JOIN veiculos r ON r.id = s.reboque_id
    LEFT JOIN motoristas m ON m.id = s.motorista_id`;

export async function listarServicos(empresaId: string, filtro: { estado?: EstadoServico | "abertos"; clienteId?: string } = {}) {
  const cond: string[] = ["s.empresa_id = $1"];
  const params: unknown[] = [empresaId];
  if (filtro.estado === "abertos") cond.push("s.estado IN ('pedido','planeado','em_curso')");
  else if (filtro.estado) {
    params.push(filtro.estado);
    cond.push(`s.estado = $${params.length}`);
  }
  if (filtro.clienteId) {
    params.push(filtro.clienteId);
    cond.push(`s.cliente_id = $${params.length}`);
  }
  return query<ServicoLinha>(
    `${SELECT} WHERE ${cond.join(" AND ")}
     ORDER BY CASE s.estado WHEN 'em_curso' THEN 0 WHEN 'planeado' THEN 1 WHEN 'pedido' THEN 2 ELSE 3 END,
              s.data_carga NULLS LAST, s.numero DESC
     LIMIT 300`,
    params
  );
}

export async function obterServico(empresaId: string, id: string) {
  return queryOne<ServicoLinha>(`${SELECT} WHERE s.empresa_id = $1 AND s.id = $2`, [empresaId, id]);
}

export async function servicosDoMotorista(empresaId: string, motoristaId: string) {
  return query<ServicoLinha>(
    `${SELECT}
      WHERE s.empresa_id = $1 AND s.motorista_id = $2
        AND (s.estado IN ('planeado','em_curso')
             OR (s.estado = 'entregue' AND s.data_entrega > now() - interval '7 days'))
      ORDER BY CASE s.estado WHEN 'em_curso' THEN 0 WHEN 'planeado' THEN 1 ELSE 2 END, s.data_carga NULLS LAST`,
    [empresaId, motoristaId]
  );
}

export async function eventosServico(empresaId: string, servicoId: string) {
  return query<{ id: string; tipo: string; descricao: string | null; local: string | null; ocorrido_em: string; utilizador: string | null }>(
    `SELECT e.id, e.tipo, e.descricao, e.local, e.ocorrido_em, u.nome AS utilizador
       FROM eventos_servico e LEFT JOIN utilizadores u ON u.id = e.utilizador_id
      WHERE e.empresa_id = $1 AND e.servico_id = $2
      ORDER BY e.ocorrido_em DESC`,
    [empresaId, servicoId]
  );
}

export async function contagemPorEstado(empresaId: string) {
  const rows = await query<{ estado: EstadoServico; n: number }>(
    "SELECT estado, count(*)::int AS n FROM servicos WHERE empresa_id = $1 GROUP BY estado",
    [empresaId]
  );
  return Object.fromEntries(rows.map((r) => [r.estado, r.n])) as Partial<Record<EstadoServico, number>>;
}
