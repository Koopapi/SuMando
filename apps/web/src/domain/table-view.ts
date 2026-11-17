// Tablas con filtros por tipo, grupos plegables y páginas (spec 014, RF-8 a RF-18). Reglas puras: la tabla del
// sistema de diseño las aplica a todos los renglones, no solo a los que se ven.
import { matchesSearch } from "./search";

export interface TableFilter<T> {
  id: string;
  /** Tipo del filtro (Área, Proveedor, Estado…): uno elegido por tipo (RF-8). */
  group: string;
  label: string;
  test: (row: T) => boolean;
}

/** RF-8 y RF-12: un filtro por tipo (los tipos se combinan) y la búsqueda, sobre todos los renglones. */
export function applyTable<T>(rows: T[], filters: TableFilter<T>[], chosen: Record<string, string>, query: string, fields: (row: T) => string[]): T[] {
  const active = filters.filter((f) => chosen[f.group] === f.id);
  return rows.filter((r) => matchesSearch(fields(r), query) && active.every((f) => f.test(r)));
}

export interface RowGroup<T> {
  key: string;
  label: string;
  rows: T[];
}

/** RF-13 y RF-14: grupos por su nombre, con el de «Sin…» al final. */
export function groupRows<T>(rows: T[], by: (row: T) => string | null, noneLabel: string): RowGroup<T>[] {
  const map = new Map<string, RowGroup<T>>();
  for (const r of rows) {
    const label = by(r);
    const key = label ?? "\u0000none";
    if (!map.has(key)) map.set(key, { key, label: label ?? noneLabel, rows: [] });
    map.get(key)!.rows.push(r);
  }
  return [...map.values()].sort((a, b) => (a.key === "\u0000none" ? 1 : b.key === "\u0000none" ? -1 : a.label.localeCompare(b.label, "es")));
}

export const GROUPS_OPEN_UP_TO = 50;

/** RF-16 y RF-17: abiertos con 50 renglones o menos, o si hay búsqueda o filtro. */
export const openByDefault = (total: number, searching = false) => searching || total <= GROUPS_OPEN_UP_TO;

export const PAGE_SIZE = 25;

/** RF-18: la página pedida (acotada), cuántas hay y qué renglones van del 1 al total. */
export function pageOf<T>(rows: T[], page: number, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(1, page), pages);
  const start = (p - 1) * size;
  const slice = rows.slice(start, start + size);
  return { page: p, pages, rows: slice, from: slice.length ? start + 1 : 0, to: start + slice.length };
}
