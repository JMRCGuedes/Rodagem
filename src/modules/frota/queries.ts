import "server-only";
import { query, queryOne } from "@/lib/db";

export const TIPOS_VEICULO = {
  trator: "Trator",
  reboque: "Reboque / semirreboque",
  rigido: "Rígido",
  ligeiro: "Ligeiro",
} as const;
export type TipoVeiculo = keyof typeof TIPOS_VEICULO;

export const ESTADOS_VEICULO = {
  ativo: "Ativo",
  oficina: "Na oficina",
  inativo: "Inativo",
} as const;
export type EstadoVeiculo = keyof typeof ESTADOS_VEICULO;

/** Tipos de veículo que têm tacógrafo (descarga da unidade a cada 90 dias). */
export const TIPOS_COM_TACOGRAFO: TipoVeiculo[] = ["trator", "rigido"];

export type Veiculo = {
  id: string;
  tipo: TipoVeiculo;
  matricula: string;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  km: number | null;
  estado: EstadoVeiculo;
  notas: string | null;
  carrocaria: string | null;
  motorista_habitual_id: string | null;
};

export async function listarVeiculos(empresaId: string, opcoes: { incluirInativos?: boolean } = {}) {
  return query<Veiculo & { proxima_validade: string | null; motorista_habitual: string | null }>(
    `SELECT v.id, v.tipo, v.matricula, v.marca, v.modelo, v.ano, v.km, v.estado, v.notas, v.carrocaria, v.motorista_habitual_id,
            (SELECT m.nome FROM motoristas m WHERE m.id = v.motorista_habitual_id) AS motorista_habitual,
            (SELECT min(d.data_validade) FROM documentos d
              WHERE d.veiculo_id = v.id AND d.data_validade IS NOT NULL) AS proxima_validade
       FROM veiculos v
      WHERE v.empresa_id = $1 AND ($2::boolean OR v.estado <> 'inativo')
      ORDER BY v.tipo, v.matricula`,
    [empresaId, opcoes.incluirInativos ?? false]
  );
}

export async function obterVeiculo(empresaId: string, id: string) {
  return queryOne<Veiculo>(
    `SELECT id, tipo, matricula, marca, modelo, ano, km, estado, notas, carrocaria, motorista_habitual_id
       FROM veiculos WHERE empresa_id = $1 AND id = $2`,
    [empresaId, id]
  );
}

export function descricaoVeiculo(v: Pick<Veiculo, "matricula" | "marca" | "modelo">) {
  const extra = [v.marca, v.modelo].filter(Boolean).join(" ");
  return extra ? `${v.matricula} · ${extra}` : v.matricula;
}
