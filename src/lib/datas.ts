/** Datas no calendário de Lisboa, em texto "AAAA-MM-DD" (sem surpresas de fuso horário). */

const FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" });

export function diaLisboa(d: string | Date): string {
  return FMT.format(typeof d === "string" ? new Date(d) : d);
}

export function somarDiasISO(dia: string, n: number): string {
  const t = Date.parse(dia + "T00:00:00Z") + n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

export function diferencaDias(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}

/** Segunda-feira da semana de um dia. */
export function segundaFeira(dia: string): string {
  const dow = new Date(dia + "T00:00:00Z").getUTCDay(); // 0 = domingo
  return somarDiasISO(dia, dow === 0 ? -6 : 1 - dow);
}

export function numeroSemana(dia: string): number {
  const d = new Date(dia + "T00:00:00Z");
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const inicioAno = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - inicioAno) / 86_400_000 + 1) / 7);
}

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function rotuloDia(dia: string) {
  const d = new Date(dia + "T00:00:00Z");
  return { semana: DIAS[d.getUTCDay()]!, dia: String(d.getUTCDate()), mes: MESES[d.getUTCMonth()]! };
}

export function diaCurto(dia: string) {
  const r = rotuloDia(dia);
  return `${r.dia} ${r.mes}`;
}

/** "AAAA-MM-DD" + hora (Lisboa) → Date. */
export function diaHoraLisboa(dia: string, hora = 8): Date {
  // Lisboa está a UTC+0 no inverno e UTC+1 no verão: testa as duas e fica com a que dá a hora certa.
  for (const offset of [0, 1]) {
    const d = new Date(Date.UTC(Number(dia.slice(0, 4)), Number(dia.slice(5, 7)) - 1, Number(dia.slice(8, 10)), hora - offset));
    const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", hour: "2-digit", hour12: false }).format(d));
    if (h === hora) return d;
  }
  return new Date(dia + `T${String(hora).padStart(2, "0")}:00:00Z`);
}
