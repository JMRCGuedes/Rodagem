import { z } from "zod";

export type EstadoAcao = { erro?: string; ok?: string } | undefined;

/** Converte FormData num objeto simples: texto aparado, campos vazios passam a undefined. */
export function lerForm(fd: FormData): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    out[k] = t === "" ? undefined : t;
  }
  return out;
}

/** Valida com zod e devolve a primeira mensagem de erro em português. */
export function validar<T extends z.ZodTypeAny>(
  schema: T,
  dados: unknown
): { ok: true; dados: z.infer<T> } | { ok: false; erro: string } {
  const r = schema.safeParse(dados);
  if (r.success) return { ok: true, dados: r.data };
  const issue = r.error.issues[0];
  return { ok: false, erro: issue?.message ?? "Dados inválidos." };
}

export const texto = (msg: string) => z.string({ required_error: msg }).min(1, msg);
export const textoOpc = () => z.string().optional();
export const dataOpc = () =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
    .optional();
export const inteiroOpc = (msg: string) =>
  z.coerce.number({ invalid_type_error: msg }).int(msg).min(0, msg).optional();
export const decimalOpc = (msg: string) => z.coerce.number({ invalid_type_error: msg }).min(0, msg).optional();
export const uuidOpc = () => z.string().uuid("Seleção inválida.").optional();

/** Erros de unicidade do Postgres (código 23505). */
export function eDuplicado(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
