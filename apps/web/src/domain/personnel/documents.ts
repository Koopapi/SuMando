// Estado de los documentos del expediente (spec 008, RF-21 a RF-23). Fechas como «AAAA-MM-DD» (días de calendario).
export type DocStatus = "delivered" | "missing" | "expired";

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDate(text: unknown): text is string {
  if (typeof text !== "string") return false;
  const m = DATE.exec(text);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

/** Suma meses de calendario: 31 de enero + 1 mes = último día de febrero. */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

/** RF-21 y RF-22: sin archivos vigentes, falta; con vigencia, vencido si expedición + vigencia es anterior a hoy. */
export function docStatus(validityMonths: number | null, files: { issuedOn: string | null }[], today: string): DocStatus {
  if (files.length === 0) return "missing";
  if (validityMonths === null) return "delivered";
  const latest = files.map((f) => f.issuedOn).filter((d): d is string => d !== null).sort().at(-1);
  if (!latest) return "delivered";
  return addMonths(latest, validityMonths) < today ? "expired" : "delivered";
}

/** RF-23: cuántos obligatorios están entregados y vigentes, de cuántos. */
export function requiredSummary(docs: { required: boolean; status: DocStatus }[]): { ok: number; total: number } {
  const required = docs.filter((d) => d.required);
  return { ok: required.filter((d) => d.status === "delivered").length, total: required.length };
}

/** Fecha del día en la Ciudad de México (UTC−6, sin horario de verano desde 2022). */
export function todayInMexico(now: Date): string {
  return new Date(now.getTime() - 6 * 3_600_000).toISOString().slice(0, 10);
}
