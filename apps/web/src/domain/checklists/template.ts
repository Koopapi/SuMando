// Plantillas de checklist (spec 010, RF-6, RF-7, RF-10, RF-11, RF-16, RF-18): días como máscara (0 = lunes),
// tipos de punto y si una plantilla aplica en una fecha de calendario.
export const ITEM_KINDS = ["check", "photo", "comment"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const TEMPLATE_NAME_MAX = 80;
export const SECTION_NAME_MAX = 80;
export const ITEM_TEXT_MAX = 200;
export const COMMENT_MAX = 500;
export const DEVICE_NAME_MAX = 40;

export const isItemKind = (k: unknown): k is ItemKind => typeof k === "string" && (ITEM_KINDS as readonly string[]).includes(k);

/** Solo las palomitas (con o sin foto) pueden ser clave (RF-11). */
export const canBeKey = (kind: ItemKind) => kind !== "comment";

export function daysToMask(days: number[]): number {
  return days.reduce((m, d) => m | (1 << d), 0);
}

export function maskToDays(mask: number): number[] {
  return [0, 1, 2, 3, 4, 5, 6].filter((d) => mask & (1 << d));
}

/** Días válidos: enteros 0–6, al menos uno (RF-7). */
export function validDays(days: unknown): number[] | null {
  if (!Array.isArray(days)) return null;
  const set = [...new Set(days)];
  if (set.length === 0 || !set.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) return null;
  return (set as number[]).sort();
}

/** Día de la semana de una fecha «AAAA-MM-DD», con lunes = 0. */
export const weekdayOf = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;

/** RF-16: la plantilla aplica en esa sucursal y ese día. */
export function appliesOn(template: { daysMask: number; branchIds: string[] }, branchId: string, date: string): boolean {
  return template.branchIds.includes(branchId) && (template.daysMask & (1 << weekdayOf(date))) !== 0;
}
