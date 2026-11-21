import "server-only";
import { query, queryOne } from "@/lib/db";
import { carrocariaCompativel, CARROCARIAS, type Carrocaria } from "@/lib/carrocaria";
import { diaCurto, diaLisboa, hojeISO } from "./util";
import { kmEntre, normalizarLocal } from "@/lib/geo";

/**
 * Tudo o que o planeamento precisa de saber sobre a frota, carregado de uma vez:
 * veículos com motor (tratores e rígidos), serviços recentes e futuros, documentos com validade.
 * Usado pelo quadro de planeamento e pelo assistente de cargas.
 */

export type VeiculoPlan = {
  id: string;
  matricula: string;
  tipo: "trator" | "rigido";
  estado: string;
  carrocaria: string | null;
  motorista_id: string | null;
  motorista: string | null;
};

export type ServicoPlan = {
  id: string;
  numero: number;
  estado: string;
  origem: string;
  destino: string;
  cliente: string | null;
  data_carga: string | null;
  data_entrega: string | null;
  trator_id: string | null;
  reboque: string | null;
  motorista_id: string | null;
  motorista: string | null;
  inicio: string | null; // dia de carga (Lisboa)
  fim: string | null; // dia de entrega (Lisboa), ou o da carga
};

export type Contexto = {
  base: string | null;
  veiculos: VeiculoPlan[];
  servicos: ServicoPlan[];
  docs: { veiculo_id: string | null; motorista_id: string | null; tipo: string; data_validade: string }[];
};

export async function carregarContexto(empresaId: string): Promise<Contexto> {
  const [empresa, veiculos, servicos, docs] = await Promise.all([
    queryOne<{ localidade_base: string | null }>("SELECT localidade_base FROM empresas WHERE id=$1", [empresaId]),
    query<VeiculoPlan>(
      `SELECT v.id, v.matricula, v.tipo, v.estado, v.carrocaria, v.motorista_habitual_id AS motorista_id, m.nome AS motorista
         FROM veiculos v LEFT JOIN motoristas m ON m.id = v.motorista_habitual_id AND m.ativo
        WHERE v.empresa_id=$1 AND v.tipo IN ('trator','rigido') AND v.estado <> 'inativo'
        ORDER BY v.matricula`,
      [empresaId]
    ),
    query<Omit<ServicoPlan, "inicio" | "fim">>(
      `SELECT s.id, s.numero, s.estado, s.origem, s.destino, c.nome AS cliente, s.data_carga, s.data_entrega,
              s.trator_id, r.matricula AS reboque, s.motorista_id, m.nome AS motorista
         FROM servicos s
         LEFT JOIN clientes c ON c.id = s.cliente_id
         LEFT JOIN veiculos r ON r.id = s.reboque_id
         LEFT JOIN motoristas m ON m.id = s.motorista_id
        WHERE s.empresa_id=$1 AND s.estado <> 'cancelado'
          AND (s.data_carga IS NULL OR s.data_carga > now() - interval '60 days')
        ORDER BY s.data_carga NULLS LAST`,
      [empresaId]
    ),
    query<Contexto["docs"][number]>(
      `SELECT veiculo_id, motorista_id, tipo, data_validade FROM documentos
        WHERE empresa_id=$1 AND data_validade IS NOT NULL AND (veiculo_id IS NOT NULL OR motorista_id IS NOT NULL)`,
      [empresaId]
    ),
  ]);
  return {
    base: empresa?.localidade_base ?? null,
    veiculos,
    servicos: servicos.map((s) => {
      const inicio = s.data_carga ? diaLisboa(s.data_carga) : null;
      const fim = s.data_entrega ? diaLisboa(s.data_entrega) : inicio;
      return { ...s, inicio, fim: fim && inicio && fim < inicio ? inicio : fim };
    }),
    docs,
  };
}

/** Serviços que ocupam o veículo ou o motorista (planeados ou em curso). */
function ocupa(s: ServicoPlan) {
  return s.estado === "planeado" || s.estado === "em_curso";
}

function sobrepoe(s: ServicoPlan, inicio: string, fim: string) {
  if (!s.inicio || !s.fim) return false;
  return s.inicio <= fim && s.fim >= inicio;
}

/** Onde o veículo estará no dia indicado: destino do último serviço que acaba antes, ou a sede. */
export function localNoDia(ctx: Contexto, veiculoId: string, dia: string, excluirServico?: string) {
  let ultimo: ServicoPlan | null = null;
  for (const s of ctx.servicos) {
    if (s.trator_id !== veiculoId || s.id === excluirServico || s.estado === "pedido" || !s.fim) continue;
    if (s.fim <= dia && (!ultimo || s.fim > ultimo.fim! || (s.fim === ultimo.fim && (s.data_entrega ?? "") > (ultimo.data_entrega ?? "")))) {
      ultimo = s;
    }
  }
  return ultimo ? { local: ultimo.destino, desde: ultimo.fim!, servico: ultimo } : { local: ctx.base, desde: null, servico: null };
}

export function eLonge(ctx: Contexto, local: string | null) {
  if (!local || !ctx.base) return false;
  return normalizarLocal(local) !== normalizarLocal(ctx.base);
}

export type Sugestao = {
  veiculo: VeiculoPlan;
  local: string | null;
  kmVazio: number | null;
  avisos: string[];
  razoes: string[];
  disponivel: boolean;
};

/**
 * Candidatos para fazer uma carga: livres nas datas, perto da origem, com documentos em dia
 * e carroçaria compatível. Ordenados do melhor para o pior.
 */
export async function sugerirVeiculos(
  ctx: Contexto,
  pedido: { servicoId?: string; origem: string; carrocaria: string | null; inicio: string; fim: string },
  podeGeocodificar: () => boolean
): Promise<Sugestao[]> {
  const resultado: Sugestao[] = [];
  for (const v of ctx.veiculos) {
    const avisos: string[] = [];
    const razoes: string[] = [];

    const ocupado = ctx.servicos.find((s) => s.id !== pedido.servicoId && ocupa(s) && s.trator_id === v.id && sobrepoe(s, pedido.inicio, pedido.fim));
    const motoristaOcupado =
      v.motorista_id &&
      ctx.servicos.find((s) => s.id !== pedido.servicoId && ocupa(s) && s.motorista_id === v.motorista_id && sobrepoe(s, pedido.inicio, pedido.fim));
    const disponivel = !ocupado && v.estado === "ativo";
    if (ocupado) avisos.push(`Ocupado com S-${String(ocupado.numero).padStart(4, "0")}.`);
    if (v.estado === "oficina") avisos.push("Na oficina.");
    if (!v.motorista_id) avisos.push("Sem motorista habitual.");
    else if (motoristaOcupado) avisos.push(`${v.motorista} está noutro serviço.`);

    const compat = carrocariaCompativel(pedido.carrocaria, v.carrocaria);
    if (compat === false) {
      avisos.push(`Carroçaria ${CARROCARIAS[v.carrocaria as Carrocaria] ?? v.carrocaria}, a carga pede ${CARROCARIAS[pedido.carrocaria as Carrocaria] ?? pedido.carrocaria}.`);
    }

    const expirados = ctx.docs.filter(
      (d) => (d.veiculo_id === v.id || (v.motorista_id && d.motorista_id === v.motorista_id)) && d.data_validade < pedido.inicio
    );
    for (const d of expirados) avisos.push(`${d.tipo} ${d.veiculo_id ? "do veículo" : "do motorista"} expirado.`);

    const onde = localNoDia(ctx, v.id, pedido.inicio, pedido.servicoId);
    const kmVazio = await kmEntre(onde.local, pedido.origem, podeGeocodificar());
    if (onde.local) {
      razoes.push(
        onde.desde
          ? `Livre em ${onde.local} desde ${diaCurto(onde.desde)}${kmVazio !== null ? `: ${kmVazio} km em vazio` : ""}.`
          : `Parte da sede (${onde.local})${kmVazio !== null ? `: ${kmVazio} km em vazio` : ""}.`
      );
    }
    if (!expirados.length) razoes.push("Documentos em dia.");
    if (compat === true && pedido.carrocaria) razoes.push("Carroçaria compatível.");

    resultado.push({ veiculo: v, local: onde.local, kmVazio, avisos, razoes, disponivel });
  }
  return resultado.sort((a, b) => {
    if (a.disponivel !== b.disponivel) return a.disponivel ? -1 : 1;
    if (a.avisos.length !== b.avisos.length) return a.avisos.length - b.avisos.length;
    return (a.kmVazio ?? 99_999) - (b.kmVazio ?? 99_999);
  });
}

export { hojeISO };
