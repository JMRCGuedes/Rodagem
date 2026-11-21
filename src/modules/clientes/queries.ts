import "server-only";
import { query, queryOne } from "@/lib/db";

export type Cliente = {
  id: string;
  nome: string;
  nif: string | null;
  contacto: string | null;
  telefone: string | null;
  email: string | null;
  morada: string | null;
  notas: string | null;
};

export async function listarClientes(empresaId: string) {
  return query<Cliente & { servicos: number }>(
    `SELECT c.id, c.nome, c.nif, c.contacto, c.telefone, c.email, c.morada, c.notas,
            (SELECT count(*)::int FROM servicos s WHERE s.cliente_id = c.id) AS servicos
       FROM clientes c WHERE c.empresa_id = $1 ORDER BY c.nome`,
    [empresaId]
  );
}

export async function obterCliente(empresaId: string, id: string) {
  return queryOne<Cliente>(
    `SELECT id, nome, nif, contacto, telefone, email, morada, notas FROM clientes WHERE empresa_id=$1 AND id=$2`,
    [empresaId, id]
  );
}
