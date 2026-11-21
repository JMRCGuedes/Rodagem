import "server-only";
import { query, queryOne } from "@/lib/db";

export type Motorista = {
  id: string;
  nome: string;
  nif: string | null;
  telefone: string | null;
  email: string | null;
  categorias_carta: string | null;
  ativo: boolean;
  notas: string | null;
};

export async function listarMotoristas(empresaId: string, opcoes: { incluirInativos?: boolean } = {}) {
  return query<Motorista & { proxima_validade: string | null; tem_conta: boolean }>(
    `SELECT m.id, m.nome, m.nif, m.telefone, m.email, m.categorias_carta, m.ativo, m.notas,
            (SELECT min(d.data_validade) FROM documentos d
              WHERE d.motorista_id = m.id AND d.data_validade IS NOT NULL) AS proxima_validade,
            EXISTS (SELECT 1 FROM utilizadores u WHERE u.motorista_id = m.id) AS tem_conta
       FROM motoristas m
      WHERE m.empresa_id = $1 AND ($2::boolean OR m.ativo)
      ORDER BY m.ativo DESC, m.nome`,
    [empresaId, opcoes.incluirInativos ?? false]
  );
}

export async function obterMotorista(empresaId: string, id: string) {
  return queryOne<Motorista>(
    `SELECT id, nome, nif, telefone, email, categorias_carta, ativo, notas
       FROM motoristas WHERE empresa_id = $1 AND id = $2`,
    [empresaId, id]
  );
}
