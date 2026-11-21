/** Formatação para português de Portugal. Datas DATE chegam como "AAAA-MM-DD". */

export function dataPt(d: string | Date | null | undefined) {
  if (!d) return "—";
  if (typeof d === "string") {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    d = new Date(d);
  }
  return d.toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" });
}

export function dataHoraPt(d: string | Date | null | undefined) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-PT", {
    timeZone: "Europe/Lisbon",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Valor para <input type="datetime-local"> na hora de Lisboa. */
export function paraInputDataHora(d: string | Date | null | undefined) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  const partes = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
  return partes.replace(" ", "T");
}

/** Converte "AAAA-MM-DDTHH:MM" (hora de Lisboa) num Date. */
export function deInputDataHora(v: string | undefined): Date | null {
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[];
  // Descobre o desfasamento de Lisboa nesse instante (0 no inverno, +1 no verão).
  const utc = Date.UTC(y!, mo! - 1, d!, h!, mi!);
  const lisboa = new Date(new Date(utc).toLocaleString("en-US", { timeZone: "Europe/Lisbon" }));
  const utcRef = new Date(new Date(utc).toLocaleString("en-US", { timeZone: "UTC" }));
  const offset = lisboa.getTime() - utcRef.getTime();
  return new Date(utc - offset);
}

export function euros(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  return Number(v).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

export function numeroPt(v: string | number | null | undefined, sufixo = "") {
  if (v === null || v === undefined || v === "") return "—";
  return `${Number(v).toLocaleString("pt-PT")}${sufixo}`;
}

/** Hoje em Lisboa como "AAAA-MM-DD". */
export function hojeLisboa() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Lisbon" }).format(new Date());
}

/** Dias entre hoje (Lisboa) e uma data "AAAA-MM-DD" (negativo = já passou). */
export function diasAte(data: string) {
  const hoje = Date.parse(hojeLisboa() + "T00:00:00Z");
  const alvo = Date.parse(data.slice(0, 10) + "T00:00:00Z");
  return Math.round((alvo - hoje) / 86_400_000);
}

export function somarDias(data: string, dias: number) {
  const t = Date.parse(data.slice(0, 10) + "T00:00:00Z") + dias * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}
