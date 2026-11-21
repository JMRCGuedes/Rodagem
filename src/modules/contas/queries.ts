import "server-only";
import { query } from "@/lib/db";
import type { Perfil } from "@/lib/perfis";

export async function listarUtilizadores(empresaId: string) {
  return query<{ id: string; nome: string; email: string; perfis: Perfil[]; ativo: boolean; motorista: string | null }>(
    `SELECT u.id, u.nome, u.email, u.perfis, u.ativo, m.nome AS motorista
       FROM utilizadores u LEFT JOIN motoristas m ON m.id = u.motorista_id
      WHERE u.empresa_id = $1
      ORDER BY u.ativo DESC, u.nome`,
    [empresaId]
  );
}

/** Emails dos gerentes de cada empresa (para o resumo diário de alertas). */
export async function empresasComGerentes() {
  return query<{ empresa_id: string; empresa: string; emails: string[] }>(
    `SELECT e.id AS empresa_id, e.nome AS empresa, array_agg(u.email) AS emails
       FROM empresas e JOIN utilizadores u ON u.empresa_id = e.id
      WHERE u.ativo AND 'gerente' = ANY(u.perfis)
      GROUP BY e.id, e.nome`
  );
}
