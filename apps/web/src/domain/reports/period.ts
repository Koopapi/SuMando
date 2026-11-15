// Periodos del tablero (spec 012, RF-11 a RF-20, RF-32): fechas «AAAA-MM-DD» de México, ambas incluidas.
import { addDays, weekOf } from "../payroll/week";
import { isDate } from "../personnel/documents";

export const PERIOD_KINDS = ["today", "week", "month", "range"] as const;
export type PeriodKind = (typeof PERIOD_KINDS)[number];
export const RANGE_MAX_DAYS = 366;

export interface Period {
  kind: PeriodKind;
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
}

export type PeriodErrorCode = "validation" | "range_order" | "range_too_long" | "range_future";

export class PeriodError extends Error {
  constructor(readonly code: PeriodErrorCode) {
    super(code);
    this.name = "PeriodError";
  }
}

const utc = (date: string) => new Date(`${date}T00:00:00Z`);
/** Días entre dos fechas, ambas incluidas. */
export const daysBetween = (from: string, to: string) => Math.round((utc(to).getTime() - utc(from).getTime()) / 86_400_000) + 1;
const lastDayOfMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
const pad = (n: number) => String(n).padStart(2, "0");

export interface PeriodInput {
  period?: unknown;
  from?: unknown;
  to?: unknown;
}

/** RF-11 a RF-18. Sin periodo, Hoy (RF-16). */
export function resolvePeriod(input: PeriodInput, today: string): Period {
  const kind = input.period === undefined || input.period === null || input.period === "" ? "today" : input.period;
  if (kind === "today") return { kind, from: today, to: today, prevFrom: addDays(today, -1), prevTo: addDays(today, -1) };
  if (kind === "week") {
    const from = weekOf(today);
    return { kind, from, to: today, prevFrom: addDays(from, -7), prevTo: addDays(today, -7) };
  }
  if (kind === "month") {
    const [y, m, d] = today.split("-").map(Number);
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    const day = Math.min(d, lastDayOfMonth(py, pm - 1));
    return { kind, from: `${y}-${pad(m)}-01`, to: today, prevFrom: `${py}-${pad(pm)}-01`, prevTo: `${py}-${pad(pm)}-${pad(day)}` };
  }
  if (kind !== "range" || !isDate(input.from) || !isDate(input.to)) throw new PeriodError("validation");
  const from = input.from;
  const to = input.to;
  if (to < from) throw new PeriodError("range_order");
  if (to > today) throw new PeriodError("range_future");
  const n = daysBetween(from, to);
  if (n > RANGE_MAX_DAYS) throw new PeriodError("range_too_long");
  return { kind, from, to, prevFrom: addDays(from, -n), prevTo: addDays(from, -1) };
}

export interface Comparison {
  change: bigint;
  /** Con un decimal; null sin periodo anterior (RF-20). */
  percent: string | null;
  direction: "up" | "down" | "same";
}

/** RF-19, RF-20: cambio contra el periodo anterior. */
export function compare(current: bigint, previous: bigint): Comparison {
  const change = current - previous;
  const direction = change > 0n ? "up" : change < 0n ? "down" : "same";
  if (previous === 0n) return { change, percent: null, direction };
  const base = previous < 0n ? -previous : previous;
  // Décimas de por ciento redondeadas a la más cercana (la mitad se aleja de cero).
  const tenths = (change * 2000n) / base;
  const rounded = tenths >= 0n ? (tenths + 1n) / 2n : (tenths - 1n) / 2n;
  const abs = rounded < 0n ? -rounded : rounded;
  return { change, percent: `${rounded < 0n ? "-" : ""}${abs / 10n}.${abs % 10n}`, direction };
}

/** RF-32: la semana (por su lunes) cuenta en el periodo que contiene su domingo. */
export const weekInPeriod = (monday: string, from: string, to: string) => {
  const sunday = addDays(monday, 6);
  return from <= sunday && sunday <= to;
};
