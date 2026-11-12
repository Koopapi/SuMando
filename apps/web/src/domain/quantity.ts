// Cantidad capturada en una captura por renglones (spec 002, RF-32 y RF-33): número no negativo, con punto o coma
// decimal y hasta 3 decimales.
export type ParsedQuantity = { ok: true; value: number } | { ok: false };

const QUANTITY = /^\d+([.,]\d{1,3})?$/;

export function parseQuantity(raw: string): ParsedQuantity {
  const text = raw.trim();
  if (!QUANTITY.test(text)) return { ok: false };
  return { ok: true, value: Number(text.replace(",", ".")) };
}

/** Botones de menos y más: suben o bajan una unidad y nunca bajan de 0. Si lo escrito no es válido, parte de 0. */
export function stepQuantity(raw: string, delta: 1 | -1): string {
  const parsed = parseQuantity(raw);
  const base = parsed.ok ? parsed.value : 0;
  const next = Math.max(0, Math.round((base + delta) * 1000) / 1000);
  return String(next);
}
