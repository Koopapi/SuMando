// Datos raros de los asistentes (spec 015, RF-12, RF-13, RF-15, RF-16): el asistente avisa y pide confirmar, nunca
// bloquea. Todo en enteros de milésimas, en la misma presentación que lo capturado.
import { formatMilli, parseMilli } from "../catalog/units";

/** Qué se compara: pedido contra máximo, conteo contra lo esperado, salida contra la existencia, entrada contra el
 *  máximo, bono o extra contra el sueldo de la semana; `blind` es el corte ciego, que nunca avisa. */
export type UnusualRule = "order" | "count" | "exit" | "entry" | "pay" | "blind";

export interface UnusualResult {
  unusual: boolean;
  /** La referencia tal como se muestra al lado del dato, o null si no hay con qué comparar. */
  expected: string | null;
}

const NONE: UnusualResult = { unusual: false, expected: null };

export function unusual(rule: UnusualRule, value: string, reference: string | null): UnusualResult {
  if (rule === "blind" || reference === null) return NONE;
  const ref = parseMilli(reference);
  if (ref === null) return NONE;
  const expected = formatMilli(ref);
  const v = parseMilli(value);
  if (v === null) return { unusual: false, expected };
  const is = (() => {
    switch (rule) {
      case "order":
        return v > 2n * ref;
      case "count":
        // |v − ref| > 30 % de ref, en enteros: 10·|v − ref| > 3·ref.
        return 10n * (v > ref ? v - ref : ref - v) > 3n * ref;
      case "exit":
        return 2n * v > ref;
      case "entry":
        return v > 3n * ref;
      case "pay":
        return v > ref;
    }
  })();
  return { unusual: is, expected };
}
