import "server-only";
import { query } from "@/lib/db";
import { diasAte, hojeLisboa, somarDias } from "@/lib/formato";

/** Prazos máximos entre descargas (Reg. UE 165/2014 e regras nacionais). */
export const PRAZO_CARTAO_DIAS = 28;
export const PRAZO_VEICULO_DIAS = 90;

export type EstadoDescarga = {
  origem: "cartao" | "veiculo";
  id: string; // motorista_id ou veiculo_id
  nome: string; // nome do motorista ou matrícula
  ultima: string | null;
  proxima: string; // data-limite da próxima descarga
  dias: number; // dias até ao limite (negativo = em atraso)
};

export async function estadoDescargas(empresaId: string): Promise<EstadoDescarga[]> {
  const [motoristas, veiculos] = await Promise.all([
    query<{ id: string; nome: string; ultima: string | null }>(
      `SELECT m.id, m.nome, max(d.data)::text AS ultima
         FROM motoristas m
         LEFT JOIN descargas_tacografo d ON d.motorista_id = m.id AND d.origem = 'cartao'
        WHERE m.empresa_id = $1 AND m.ativo
        GROUP BY m.id, m.nome`,
      [empresaId]
    ),
    query<{ id: string; matricula: string; ultima: string | null }>(
      `SELECT v.id, v.matricula, max(d.data)::text AS ultima
         FROM veiculos v
         LEFT JOIN descargas_tacografo d ON d.veiculo_id = v.id AND d.origem = 'veiculo'
        WHERE v.empresa_id = $1 AND v.estado <> 'inativo' AND v.tipo IN ('trator', 'rigido')
        GROUP BY v.id, v.matricula`,
      [empresaId]
    ),
  ]);

  const hoje = hojeLisboa();
  const lista: EstadoDescarga[] = [
    ...motoristas.map((m) => {
      const proxima = m.ultima ? somarDias(m.ultima, PRAZO_CARTAO_DIAS) : hoje;
      return { origem: "cartao" as const, id: m.id, nome: m.nome, ultima: m.ultima, proxima, dias: diasAte(proxima) };
    }),
    ...veiculos.map((v) => {
      const proxima = v.ultima ? somarDias(v.ultima, PRAZO_VEICULO_DIAS) : hoje;
      return { origem: "veiculo" as const, id: v.id, nome: v.matricula, ultima: v.ultima, proxima, dias: diasAte(proxima) };
    }),
  ];
  return lista.sort((a, b) => a.dias - b.dias);
}

export async function historicoDescargas(empresaId: string, limite = 50) {
  return query<{
    id: string;
    origem: "cartao" | "veiculo";
    data: string;
    notas: string | null;
    motorista: string | null;
    matricula: string | null;
    registado_por: string | null;
  }>(
    `SELECT d.id, d.origem, d.data, d.notas, m.nome AS motorista, v.matricula, u.nome AS registado_por
       FROM descargas_tacografo d
       LEFT JOIN motoristas m ON m.id = d.motorista_id
       LEFT JOIN veiculos v ON v.id = d.veiculo_id
       LEFT JOIN utilizadores u ON u.id = d.utilizador_id
      WHERE d.empresa_id = $1
      ORDER BY d.data DESC, d.criado_em DESC
      LIMIT $2`,
    [empresaId, limite]
  );
}
