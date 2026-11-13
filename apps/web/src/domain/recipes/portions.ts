// Porciones del recetario (spec 004, RF-17, RF-18, RF-21): porcentaje de media porción por platillo y piezas.
export const DEFAULT_HALF_PERCENT = 50;
export const MAX_PIECES = 9999;

/** Porcentaje de media porción: entero de 1 a 100. */
export const isHalfPercent = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 100;

/** Piezas completas o medias: entero de 0 a 9,999; vacío cuenta como 0; null si no es válido. */
export function parsePieces(raw: string | number): number | null {
  if (typeof raw === "number") return Number.isInteger(raw) && raw >= 0 && raw <= MAX_PIECES ? raw : null;
  const text = raw.trim();
  if (text === "") return 0;
  if (!/^\d{1,4}$/.test(text)) return null;
  return Number(text);
}
