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
