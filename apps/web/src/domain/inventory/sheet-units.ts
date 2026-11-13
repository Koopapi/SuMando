// Unidades y números de las hojas «Inventario por áreas» (spec 006, RF-10 a RF-14, RF-21, RF-34). Enteros, sin
// flotantes: las equivalencias en milésimas de la unidad base, como en la spec 003.
import type { BaseUnit } from "../catalog/units";

export type UnitKind = "weight" | "volume" | "piece" | "other";

export interface SheetUnit {
  base: BaseUnit;
  kind: UnitKind;
  /** Cuánto vale 1 de esta unidad en milésimas de la unidad base (1 kg = 1,000,000 milésimas de g). */
  factorMilli: bigint;
  /** Clave para comparar dos unidades escritas distinto («CAJAS» = «caja»). */
  key: string;
  /** Nombre para mostrar como presentación («De dos botes»). */
  label: string;
}

const strip = (raw: string) => raw.normalize("NFD").replace(/\p{Diacritic}/gu, "").normalize("NFC").trim().replace(/\s+/g, " ").toUpperCase();

const FAMILIES: [RegExp, BaseUnit, UnitKind, bigint][] = [
  [/^(KG|KGS|KILO|KILOS|KILOGRAMO|KILOGRAMOS)$/, "g", "weight", 1_000_000n],
  [/^(G|GR|GRS|GRAMO|GRAMOS)$/, "g", "weight", 1000n],
  [/^(L|LT|LTS|LITRO|LITROS)$/, "ml", "volume", 1_000_000n],
  [/^(ML|MILILITRO|MILILITROS)$/, "ml", "volume", 1000n],
  [/^(PZ|PZS|PZA|PZAS|PIEZA|PIEZAS|UNIDAD|UNIDADES)$/, "pz", "piece", 1000n],
];

/** Cómo se escribe una presentación: la primera letra en mayúscula y el resto en minúsculas. */
export function presentationLabel(raw: string): string {
  const text = raw.trim().replace(/\s+/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** RF-10: kilogramo y gramo a gramos, litro y mililitro a mililitros, todo lo demás (o vacío) a piezas. */
export function sheetUnit(raw: string): SheetUnit {
  const text = strip(raw);
  for (const [re, base, kind, factorMilli] of FAMILIES) if (re.test(text)) return { base, kind, factorMilli, key: re.source, label: presentationLabel(raw) };
  const key = text.endsWith("S") ? text.slice(0, -1) : text;
  return { base: "pz", kind: text ? "other" : "piece", factorMilli: 1000n, key: key || "PZ", label: presentationLabel(raw) };
}

/** Número de la hoja como entero escalado por 10^9 (sin flotantes); null si no es un número no negativo. */
export function sheetNumber(raw: string): bigint | null {
  const text = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?([eE][-+]?\d+)?$/.test(text)) return null;
  const [mantissa, exp = "0"] = text.toLowerCase().split("e");
  let [int, frac = ""] = mantissa.split(".");
  let shift = Number(exp);
  // Mover el punto decimal según el exponente.
  while (shift > 0) {
    int += frac.charAt(0) || "0";
    frac = frac.slice(1);
    shift--;
  }
  while (shift < 0) {
    frac = (int.slice(-1) || "0") + frac;
    int = int.slice(0, -1) || "0";
    shift++;
  }
  const nine = (frac + "0".repeat(9)).slice(0, 9);
  const rest = frac.slice(9);
  let v = BigInt(int) * 1_000_000_000n + BigInt(nine);
  if (rest && rest.charCodeAt(0) >= 53) v += 1n;
  return v;
}

/** RF-34: valor de la hoja × factor de su unidad, en milésimas de la unidad base, redondeando la mitad hacia arriba. */
export function toBaseMilli(scaled: bigint, factorMilli: bigint): bigint {
  return (scaled * factorMilli + 500_000_000n) / 1_000_000_000n;
}
