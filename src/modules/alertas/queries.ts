import "server-only";
import { query } from "@/lib/db";
import { diasAte } from "@/lib/formato";
import { estadoDescargas } from "@/modules/tacografo/queries";

export type Gravidade = "expirado" | "urgente" | "proximo";

export type Alerta = {
  chave: string;
  categoria: "documento" | "tacografo";
  sujeito: string; // matrícula, nome do motorista ou "Empresa"
  titulo: string;
  dataLimite: string;
  dias: number;
  gravidade: Gravidade;
  link: string;
};

export const HORIZONTE_DIAS = 30;

export function gravidade(dias: number): Gravidade {
  if (dias < 0) return "expirado";
  if (dias <= 7) return "urgente";
  return "proximo";
}

/**
 * Alertas calculados no momento a partir das validades e das descargas do tacógrafo.
 * Não há tabela de alertas: a fonte de verdade são as próprias datas.
 */
export async function listarAlertas(empresaId: string, horizonte = HORIZONTE_DIAS): Promise<Alerta[]> {
  const [docs, descargas] = await Promise.all([
    query<{
      id: string;
      tipo: string;
      data_validade: string;
      veiculo_id: string | null;
      motorista_id: string | null;
      matricula: string | null;
      motorista: string | null;
    }>(
      `SELECT d.id, d.tipo, d.data_validade, d.veiculo_id, d.motorista_id, v.matricula, m.nome AS motorista
         FROM documentos d
         LEFT JOIN veiculos v ON v.id = d.veiculo_id
         LEFT JOIN motoristas m ON m.id = d.motorista_id
        WHERE d.empresa_id = $1
          AND d.data_validade IS NOT NULL
          AND d.data_validade <= (now() AT TIME ZONE 'Europe/Lisbon')::date + $2::int
          AND (d.veiculo_id IS NULL OR v.estado <> 'inativo')
          AND (d.motorista_id IS NULL OR m.ativo)`,
      [empresaId, horizonte]
    ),
    estadoDescargas(empresaId),
  ]);

  const alertas: Alerta[] = [
    ...docs.map((d) => {
      const dias = diasAte(d.data_validade);
      return {
        chave: `doc-${d.id}`,
        categoria: "documento" as const,
        sujeito: d.matricula ?? d.motorista ?? "Empresa",
        titulo: d.tipo,
        dataLimite: d.data_validade,
        dias,
        gravidade: gravidade(dias),
        link: d.veiculo_id ? `/frota/${d.veiculo_id}` : d.motorista_id ? `/motoristas/${d.motorista_id}` : "/empresa",
      };
    }),
    ...descargas
      .filter((t) => t.dias <= Math.min(horizonte, 14))
      .map((t) => ({
        chave: `taco-${t.origem}-${t.id}`,
        categoria: "tacografo" as const,
        sujeito: t.nome,
        titulo: t.origem === "cartao" ? "Descarga do cartão de condutor" : "Descarga da unidade do tacógrafo",
        dataLimite: t.proxima,
        dias: t.dias,
        gravidade: t.ultima ? gravidade(t.dias) : ("expirado" as Gravidade),
        link: "/tacografo",
      })),
  ];
  return alertas.sort((a, b) => a.dias - b.dias);
}

export function textoDias(a: Pick<Alerta, "dias">) {
  if (a.dias < 0) return `expirou há ${Math.abs(a.dias)} ${Math.abs(a.dias) === 1 ? "dia" : "dias"}`;
  if (a.dias === 0) return "expira hoje";
  if (a.dias === 1) return "expira amanhã";
  return `faltam ${a.dias} dias`;
}
