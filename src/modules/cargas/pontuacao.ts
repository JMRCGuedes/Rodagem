import "server-only";
import { kmEntre } from "@/lib/geo";
import { hojeISO } from "@/modules/planeamento/util";
import { eLonge, sugerirVeiculos, type Contexto, type Sugestao } from "@/modules/planeamento/contexto";
import type { Oferta } from "./queries";

/**
 * Pontuação de uma oferta de carga (0 a 100). Não é IA: é uma fórmula simples e explicável.
 *   até 40 pontos  €/km (0,90 €/km = 0 … 1,60 €/km ou mais = 40)
 *   até 35 pontos  quilómetros em vazio até à carga (0 km = 35 … 300 km ou mais = 0)
 *   15 pontos      há camião livre nas datas, com carroçaria compatível
 *   10 pontos      camião e motorista com documentos em dia
 */
export const LIMITES = { eurKmMin: 0.9, eurKmMax: 1.6, vazioMax: 300 };

export type Razao = { tipo: "bom" | "atencao"; texto: string };

export type Avaliacao = {
  nota: number;
  km: number | null;
  eurKm: number | null;
  melhor: Sugestao | null;
  alternativas: Sugestao[];
  razoes: Razao[];
  retorno: boolean;
};

const fmt = (n: number, casas = 2) => n.toLocaleString("pt-PT", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export async function avaliarOferta(ctx: Contexto, o: Oferta, podeGeocodificar: () => boolean): Promise<Avaliacao> {
  const razoes: Razao[] = [];
  const km = o.km ?? (await kmEntre(o.origem, o.destino, podeGeocodificar()));
  const preco = o.preco !== null ? Number(o.preco) : null;
  const eurKm = preco !== null && km ? preco / km : null;

  let nota = 0;
  if (eurKm !== null) {
    const f = Math.min(1, Math.max(0, (eurKm - LIMITES.eurKmMin) / (LIMITES.eurKmMax - LIMITES.eurKmMin)));
    nota += Math.round(f * 40);
    razoes.push(
      eurKm >= 1.4
        ? { tipo: "bom", texto: `${fmt(eurKm)} €/km (${km} km estimados).` }
        : { tipo: "atencao", texto: `Só ${fmt(eurKm)} €/km (${km} km estimados).` }
    );
  } else if (preco === null) {
    razoes.push({ tipo: "atencao", texto: "Sem preço indicado: negociar." });
    nota += 12;
  } else {
    razoes.push({ tipo: "atencao", texto: "Não foi possível calcular a distância." });
    nota += 12;
  }

  const inicio = o.data_carga ?? hojeISO();
  const sugestoes = await sugerirVeiculos(
    ctx,
    { origem: o.origem, carrocaria: o.carrocaria, inicio, fim: o.data_entrega ?? inicio },
    podeGeocodificar
  );
  const melhor = sugestoes.find((s) => s.disponivel) ?? null;

  if (!melhor) {
    razoes.push({ tipo: "atencao", texto: "Nenhum camião livre nessas datas." });
  } else {
    const kmVazio = melhor.kmVazio;
    nota += kmVazio === null ? 10 : Math.round(35 * (1 - Math.min(kmVazio, LIMITES.vazioMax) / LIMITES.vazioMax));
    const carroceriaErrada = melhor.avisos.some((a) => a.startsWith("Carroçaria"));
    const docs = melhor.avisos.filter((a) => a.includes("expirado"));
    if (!carroceriaErrada) nota += 15;
    if (!docs.length) nota += 10;

    const quem = `${melhor.veiculo.matricula}${melhor.veiculo.motorista ? ` (${melhor.veiculo.motorista})` : ""}`;
    if (kmVazio !== null) {
      razoes.push({
        tipo: kmVazio <= 100 ? "bom" : "atencao",
        texto: `${quem} está ${melhor.local ? `em ${melhor.local}` : "livre"}: ${kmVazio} km em vazio até à carga.`,
      });
    } else {
      razoes.push({ tipo: "atencao", texto: `${quem} está livre, mas não foi possível calcular os km em vazio.` });
    }
    for (const a of melhor.avisos) razoes.push({ tipo: "atencao", texto: `${melhor.veiculo.matricula}: ${a}` });
    if (!docs.length && !carroceriaErrada) razoes.push({ tipo: "bom", texto: "Documentos em dia e carroçaria compatível." });
  }

  // Carga de retorno: o camião está longe da sede e a carga leva-o para perto de casa.
  let retorno = false;
  if (melhor && eLonge(ctx, melhor.local) && ctx.base) {
    const kmCasa = await kmEntre(o.destino, ctx.base, podeGeocodificar());
    if (kmCasa !== null && kmCasa <= 150) {
      retorno = true;
      razoes.unshift({ tipo: "bom", texto: `Carga de retorno: leva ${melhor.veiculo.matricula} de volta para perto da sede.` });
      nota = Math.min(100, nota + 5);
    }
  }

  return { nota: Math.min(100, nota), km, eurKm, melhor, alternativas: sugestoes.slice(0, 5), razoes, retorno };
}
