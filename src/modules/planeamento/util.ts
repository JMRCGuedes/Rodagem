export { diaLisboa, diaCurto } from "@/lib/datas";

export function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}
