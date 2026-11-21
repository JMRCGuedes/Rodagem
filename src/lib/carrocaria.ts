export const CARROCARIAS = {
  lona: "Lona",
  frigorifico: "Frigorífico",
  caixa: "Caixa fechada",
  cisterna: "Cisterna",
  porta_contentores: "Porta-contentores",
  basculante: "Basculante",
  plataforma: "Plataforma",
  outro: "Outro",
} as const;
export type Carrocaria = keyof typeof CARROCARIAS;
export const LISTA_CARROCARIAS = Object.keys(CARROCARIAS) as Carrocaria[];

/** Uma carga com carroçaria pedida só pode ir num veículo com a mesma carroçaria (lona aceita "caixa" e vice-versa não). */
export function carrocariaCompativel(pedida: string | null | undefined, veiculo: string | null | undefined) {
  if (!pedida || pedida === "outro") return true;
  if (!veiculo) return null; // desconhecido
  if (pedida === veiculo) return true;
  // Frigorífico pode levar carga seca; lona e caixa servem para carga geral paletizada.
  if (veiculo === "frigorifico" && (pedida === "caixa" || pedida === "lona")) return true;
  if (veiculo === "caixa" && pedida === "lona") return true;
  return false;
}
