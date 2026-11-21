import "server-only";
import { query, queryOne } from "./db";

/**
 * Localidades e distâncias.
 * Geocodificação com o Nominatim (OpenStreetMap), respeitando a política de uso:
 * no máximo 1 pedido por segundo, identificação no User-Agent e cache permanente.
 * A distância é estimada em linha reta × 1,25 (aproximação da distância por estrada);
 * chega para comparar ofertas e quilómetros em vazio.
 */

const FATOR_ESTRADA = 1.25;
const USER_AGENT = "Rodagem/0.2 (gestao de frota; https://github.com/JMRCGuedes/Rodagem)";

export type Coordenadas = { lat: number; lon: number };

export function normalizarLocal(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/[^a-z0-9 ,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

declare global {
  // eslint-disable-next-line no-var
  var __rodagemUltimoGeocode: number | undefined;
}

async function esperarVez() {
  const agora = Date.now();
  const ultimo = globalThis.__rodagemUltimoGeocode ?? 0;
  const espera = Math.max(0, ultimo + 1100 - agora);
  globalThis.__rodagemUltimoGeocode = agora + espera;
  if (espera) await new Promise((r) => setTimeout(r, espera));
}

async function pedirNominatim(nome: string): Promise<Coordenadas | null> {
  await esperarVez();
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", nome);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("accept-language", "pt");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: ctrl.signal });
    if (!r.ok) return null;
    const json = (await r.json()) as { lat: string; lon: string }[];
    const p = json[0];
    if (!p) return null;
    return { lat: Number(p.lat), lon: Number(p.lon) };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Coordenadas de uma localidade. Usa a cache; só pergunta ao Nominatim quando `permitirPedido`
 * for verdadeiro (as páginas limitam o número de pedidos novos para não ficarem lentas).
 */
export async function geocodificar(nome: string | null | undefined, permitirPedido = true): Promise<Coordenadas | null> {
  if (!nome) return null;
  const chave = normalizarLocal(nome);
  if (!chave) return null;
  const cache = await queryOne<{ lat: number | null; lon: number | null }>("SELECT lat, lon FROM locais WHERE chave = $1", [chave]);
  if (cache) return cache.lat !== null && cache.lon !== null ? { lat: cache.lat, lon: cache.lon } : null;
  if (!permitirPedido) return null;
  const c = await pedirNominatim(nome);
  await query(
    "INSERT INTO locais (chave, nome, lat, lon) VALUES ($1, $2, $3, $4) ON CONFLICT (chave) DO NOTHING",
    [chave, nome, c?.lat ?? null, c?.lon ?? null]
  );
  return c;
}

export function distanciaKm(a: Coordenadas, b: Coordenadas) {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * FATOR_ESTRADA);
}

/** Quilómetros estimados entre duas localidades, ou null se alguma não for encontrada. */
export async function kmEntre(a: string | null | undefined, b: string | null | undefined, permitirPedido = true) {
  if (!a || !b) return null;
  if (normalizarLocal(a) === normalizarLocal(b)) return 0;
  const [ca, cb] = [await geocodificar(a, permitirPedido), await geocodificar(b, permitirPedido)];
  if (!ca || !cb) return null;
  return distanciaKm(ca, cb);
}

/**
 * Orçamento de pedidos novos ao Nominatim por pedido de página: devolve uma função que diz
 * se ainda se pode pedir. Evita que uma página com muitas localidades novas demore minutos.
 */
export function orcamentoGeocode(max: number) {
  let usados = 0;
  return () => usados++ < max;
}
