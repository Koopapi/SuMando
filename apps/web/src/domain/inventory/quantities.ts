// Cantidades del inventario (spec 005, RF-7 a RF-9, RF-18 a RF-21, RF-56). Enteros, sin flotantes: lo capturado en
// milésimas de la presentación, las existencias en millonésimas de la unidad base.
import { formatMilli, fromBaseMicro, parseMilli } from "../catalog/units";

/** Tope de una cantidad capturada: 9,999,999.999 en la presentación elegida. */
export const LINE_MAX_MILLI = 9_999_999_999n;

/** Cantidad de un renglón de entrada, salida o traspaso: mayor que cero, hasta 3 decimales (RF-8). */
export function parseLineQuantity(raw: string): bigint | null {
  const v = parseMilli(raw);
  return v === null || v === 0n || v > LINE_MAX_MILLI ? null : v;
}

/** Cantidad contada: como la de un renglón, pero admite cero (RF-45). */
export function parseCountQuantity(raw: string): bigint | null {
  const v = parseMilli(raw);
  return v === null || v > LINE_MAX_MILLI ? null : v;
}

/** Cantidad de un ajuste: con signo («-1.5» resta), distinta de cero (RF-18, RF-19). */
export function parseAdjustment(raw: string): bigint | null {
  const text = raw.trim();
  const negative = text.startsWith("-");
  const body = negative || text.startsWith("+") ? text.slice(1) : text;
  const v = parseLineQuantity(body);
  if (v === null) return null;
  return negative ? -v : v;
}

/** Milésimas de una presentación × su equivalencia (milésimas) = millonésimas de la unidad base, con signo. */
export const lineToBase = (qtyMilli: bigint, factorMilli: bigint): bigint => qtyMilli * factorMilli;

/** Existencia (millonésimas, con signo) en una presentación, como texto con hasta 3 decimales (RF-9). */
export function formatStock(baseMicro: bigint, factorMilli: bigint): string {
  const negative = baseMicro < 0n;
  const milli = fromBaseMicro(negative ? -baseMicro : baseMicro, factorMilli);
  return milli === 0n ? "0" : `${negative ? "-" : ""}${formatMilli(milli)}`;
}

export type StockStatus = "negative" | "below_min" | "ok";

/** RF-21 y RF-56: negativo antes que bajo mínimo; sin mínimo, solo puede ser negativo. */
export function stockStatus(baseMicro: bigint, minMicro: bigint | null): StockStatus {
  if (baseMicro < 0n) return "negative";
  if (minMicro !== null && baseMicro < minMicro) return "below_min";
  return "ok";
}
