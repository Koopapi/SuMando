// Nombres del catálogo (spec 003, RF-31, RF-32): hasta 80 caracteres; dos nombres son el mismo si coinciden sin
// mayúsculas, sin acentos y sin espacios sobrantes.
import { normalizeName } from "../text";

export const CATALOG_NAME_MAX = 80;

export function catalogKey(raw: string): string {
  return normalizeName(raw).normalize("NFD").replace(/\p{Diacritic}/gu, "").normalize("NFC").toLowerCase();
}

export function catalogNameProblem(raw: string): "empty" | "too_long" | null {
  const name = normalizeName(raw);
  if (!name) return "empty";
  if (name.length > CATALOG_NAME_MAX) return "too_long";
  return null;
}

/** Spec 015, RF-44: clave para parecidos; además de lo de `catalogKey`, sin los espacios entre palabras. */
export function similarKey(raw: string): string {
  return catalogKey(raw).replace(/\s+/g, "");
}

export interface NameMatches {
  /** Ya existe con ese nombre (el servidor no deja repetirlo). */
  same: string | null;
  /** Se escriben igual salvo acentos, mayúsculas o espacios: hay que confirmar que es otro. */
  similar: string[];
}

/** Spec 015, RF-44: qué nombres existentes chocan o se parecen al que se escribe. */
export function nameMatches(raw: string, existing: string[]): NameMatches {
  const key = catalogKey(raw);
  const near = similarKey(raw);
  if (!near) return { same: null, similar: [] };
  const same = existing.find((n) => catalogKey(n) === key) ?? null;
  const similar = existing.filter((n) => n !== same && similarKey(n) === near);
  return { same, similar };
}
