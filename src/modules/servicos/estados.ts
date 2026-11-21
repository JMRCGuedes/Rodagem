export const ESTADOS_SERVICO = {
  pedido: "Pedido",
  planeado: "Planeado",
  em_curso: "Em curso",
  entregue: "Entregue",
  faturado: "Faturado",
  cancelado: "Cancelado",
} as const;
export type EstadoServico = keyof typeof ESTADOS_SERVICO;

/** Transições permitidas a partir de cada estado (ciclo de vida do serviço). */
export const TRANSICOES: Record<EstadoServico, EstadoServico[]> = {
  pedido: ["planeado", "cancelado"],
  planeado: ["em_curso", "pedido", "cancelado"],
  em_curso: ["entregue"],
  entregue: ["faturado", "em_curso"],
  faturado: [],
  cancelado: ["pedido"],
};

export const ACAO_TRANSICAO: Partial<Record<EstadoServico, string>> = {
  planeado: "Marcar como planeado",
  em_curso: "Iniciar (carga feita)",
  entregue: "Marcar entregue",
  faturado: "Marcar faturado",
  cancelado: "Cancelar serviço",
  pedido: "Voltar a pedido",
};

export function referencia(numero: number) {
  return `S-${String(numero).padStart(4, "0")}`;
}
