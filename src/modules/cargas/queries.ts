import "server-only";
import { query, queryOne } from "@/lib/db";

export const ESTADOS_OFERTA = {
  nova: "Novas",
  contactada: "Contactadas",
  proposta: "Proposta enviada",
  aceite: "Aceites",
  descartada: "Descartadas",
} as const;
export type EstadoOferta = keyof typeof ESTADOS_OFERTA;

export type Oferta = {
  id: string;
  fonte: string;
  estado: EstadoOferta;
  origem: string;
  destino: string;
  data_carga: string | null;
  data_entrega: string | null;
  peso_kg: string | null;
  descricao_carga: string | null;
  carrocaria: string | null;
  preco: string | null;
  empresa_anunciante: string | null;
  contacto_nome: string | null;
  contacto_telefone: string | null;
  contacto_email: string | null;
  idioma: string;
  km: number | null;
  texto_original: string | null;
  notas: string | null;
  servico_id: string | null;
  criado_em: string;
};

const CAMPOS = `id, fonte, estado, origem, destino, data_carga, data_entrega, peso_kg, descricao_carga, carrocaria, preco,
  empresa_anunciante, contacto_nome, contacto_telefone, contacto_email, idioma, km, texto_original, notas, servico_id, criado_em`;

export async function listarOfertas(empresaId: string, estado: EstadoOferta) {
  return query<Oferta>(
    `SELECT ${CAMPOS} FROM ofertas
      WHERE empresa_id=$1 AND estado=$2
        AND ($2 <> 'nova' OR data_carga IS NULL OR data_carga >= (now() AT TIME ZONE 'Europe/Lisbon')::date - 1)
      ORDER BY data_carga NULLS LAST, criado_em DESC
      LIMIT 100`,
    [empresaId, estado]
  );
}

export async function contagemOfertas(empresaId: string) {
  const rows = await query<{ estado: EstadoOferta; n: number }>(
    `SELECT estado, count(*)::int AS n FROM ofertas
      WHERE empresa_id=$1 AND (estado <> 'nova' OR data_carga IS NULL OR data_carga >= (now() AT TIME ZONE 'Europe/Lisbon')::date - 1)
      GROUP BY estado`,
    [empresaId]
  );
  return Object.fromEntries(rows.map((r) => [r.estado, r.n])) as Partial<Record<EstadoOferta, number>>;
}

export async function obterOferta(empresaId: string, id: string) {
  return queryOne<Oferta>(`SELECT ${CAMPOS} FROM ofertas WHERE empresa_id=$1 AND id=$2`, [empresaId, id]);
}
