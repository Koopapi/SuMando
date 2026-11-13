// Unidades y cantidades del catálogo (spec 003, RF-10, RF-13, RF-17, RF-23, RF-25, RF-26). Todo en enteros:
// cantidades y equivalencias en milésimas, cantidades en unidad base en millonésimas. Sin flotantes, para que un
// mínimo guardado no cambie al convertir de una presentación a otra.
export const BASE_UNITS = ["g", "ml", "pz"] as const;
export type BaseUnit = (typeof BASE_UNITS)[number];

export const isBaseUnit = (v: unknown): v is BaseUnit => typeof v === "string" && (BASE_UNITS as readonly string[]).includes(v);

const DECIMAL = /^\d+([.,]\d{1,3})?$/;

/** Cantidad no negativa con punto o coma y hasta 3 decimales, en milésimas; null si no es válida. */
export function parseMilli(raw: string): bigint | null {
  const text = raw.trim();
  if (!DECIMAL.test(text)) return null;
  const [int, frac = ""] = text.replace(",", ".").split(".");
  return BigInt(int) * 1000n + BigInt(frac.padEnd(3, "0"));
}

/** Equivalencia de una presentación: como una cantidad, pero mayor que cero. */
export function parseFactor(raw: string): bigint | null {
  const v = parseMilli(raw);
  return v === null || v === 0n ? null : v;
}

/** Cantidad en una presentación (milésimas) × equivalencia (milésimas) = unidad base en millonésimas. */
export const toBaseMicro = (qtyMilli: bigint, factorMilli: bigint): bigint => qtyMilli * factorMilli;

/** Unidad base (millonésimas) expresada en una presentación, en milésimas, redondeando la mitad hacia arriba. */
export const fromBaseMicro = (baseMicro: bigint, factorMilli: bigint): bigint => (2n * baseMicro + factorMilli) / (2n * factorMilli);

function fixed(value: bigint, decimals: number): string {
  const scale = 10n ** BigInt(decimals);
  return `${value / scale}.${String(value % scale).padStart(decimals, "0")}`;
}

/** Texto para mostrar: sin ceros sobrantes («12», «1.714»). */
export function formatMilli(milli: bigint): string {
  return fixed(milli, 3).replace(/\.?0+$/, "");
}

function fromFixed(text: string, decimals: number): bigint {
  const [int, frac = ""] = text.split(".");
  return BigInt(int) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, "0").slice(0, decimals));
}

/** Columnas `numeric` de PostgreSQL ↔ enteros del dominio. */
export const milliToDb = (v: bigint) => fixed(v, 3);
export const dbToMilli = (s: string) => fromFixed(s, 3);
export const microToDb = (v: bigint) => fixed(v, 6);
export const dbToMicro = (s: string) => fromFixed(s, 6);
