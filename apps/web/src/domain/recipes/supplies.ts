// Suma de insumos (spec 004, RF-16, RF-23 a RF-27). Todo en enteros: las cantidades de receta llegan en
// millonésimas de la unidad base y el total se lleva en centésimas de millonésima (× 100), que es lo que necesita el
// porcentaje de media porción para no perder nada. Sin flotantes: 0.1 g × 9,999 da exactamente 999.9 g.
import type { BaseUnit } from "../catalog/units";

export interface SupplyIngredient {
  productId: string;
  quantityMicro: bigint;
}

export interface SupplyRecipe {
  id: string;
  halfPercent: number;
  ingredients: SupplyIngredient[];
}

export interface SupplyProduct {
  id: string;
  name: string;
  baseUnit: BaseUnit;
  archived: boolean;
  /** Presentación de compra; null si se compra en la unidad base. */
  purchase: { name: string; factorMilli: bigint } | null;
}

export interface SupplyItem {
  recipeId: string;
  full: number;
  half: number;
}

export interface SupplyLine {
  productId: string;
  name: string;
  baseUnit: BaseUnit;
  archived: boolean;
  /** Total en centésimas de millonésima de la unidad base. */
  totalCentiMicro: bigint;
  purchase: { name: string; factorMilli: bigint; count: bigint } | null;
}

/** Presentaciones de compra que cubren el total, redondeando hacia arriba (un múltiplo exacto no suma una de más). */
export function purchaseCount(totalCentiMicro: bigint, factorMilli: bigint): bigint {
  const unit = factorMilli * 1000n * 100n;
  return (totalCentiMicro + unit - 1n) / unit;
}

export function computeSupplies(recipes: ReadonlyMap<string, SupplyRecipe>, products: ReadonlyMap<string, SupplyProduct>, items: readonly SupplyItem[]): SupplyLine[] {
  const totals = new Map<string, bigint>();
  for (const item of items) {
    const recipe = recipes.get(item.recipeId);
    if (!recipe) continue;
    const weight = 100n * BigInt(item.full) + BigInt(recipe.halfPercent) * BigInt(item.half);
    if (weight === 0n) continue;
    for (const ing of recipe.ingredients) totals.set(ing.productId, (totals.get(ing.productId) ?? 0n) + ing.quantityMicro * weight);
  }
  const lines: SupplyLine[] = [];
  for (const [productId, total] of totals) {
    const p = products.get(productId);
    if (!p || total === 0n) continue;
    lines.push({
      productId,
      name: p.name,
      baseUnit: p.baseUnit,
      archived: p.archived,
      totalCentiMicro: total,
      purchase: p.purchase ? { ...p.purchase, count: purchaseCount(total, p.purchase.factorMilli) } : null,
    });
  }
  return lines.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
}

const SCALE = 100_000_000n;

/** Total para mostrar en la unidad base: hasta 3 decimales, redondeando la mitad hacia arriba, sin ceros sobrantes. */
export function formatSupply(totalCentiMicro: bigint): string {
  const milli = (2n * totalCentiMicro + 100_000n) / 200_000n;
  return `${milli / 1000n}.${String(milli % 1000n).padStart(3, "0")}`.replace(/\.?0+$/, "");
}

/** Columna `numeric(26,8)` ↔ total exacto. */
export const centiMicroToDb = (v: bigint) => `${v / SCALE}.${String(v % SCALE).padStart(8, "0")}`;
export function dbToCentiMicro(text: string): bigint {
  const [int, frac = ""] = text.split(".");
  return BigInt(int) * SCALE + BigInt(frac.padEnd(8, "0").slice(0, 8));
}
