// Semana de nómina (spec 009, RF-2, RF-9, RF-10, RF-16): de lunes a domingo, fechas «AAAA-MM-DD» de calendario.
import { isDate } from "../personnel/documents";

export interface Period {
  hiredOn: string;
  leftOn: string | null;
}

const utc = (date: string) => new Date(`${date}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  const d = utc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

/** Lunes de la semana de una fecha. */
export function weekOf(date: string): string {
  const dow = (utc(date).getUTCDay() + 6) % 7;
  return addDays(date, -dow);
}

export const isMonday = (date: unknown): date is string => isDate(date) && weekOf(date) === date;

export const weekDates = (monday: string): string[] => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

export const dayWithinPeriods = (day: string, periods: Period[]) => periods.some((p) => p.hiredOn <= day && (p.leftOn === null || day <= p.leftOn));

/** RF-9: algún periodo cruza la semana. */
export function weekOverlapsPeriods(monday: string, periods: Period[]): boolean {
  const sunday = addDays(monday, 6);
  return periods.some((p) => p.hiredOn <= sunday && (p.leftOn === null || p.leftOn >= monday));
}

export const dayIsFuture = (day: string, today: string) => day > today;
