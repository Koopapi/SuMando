// Validación de una receta (spec 004, RF-7, RF-8, RF-10, RF-11, RF-13, RF-18, RF-50). Regla pura: el servicio
// comprueba después que cada producto exista, esté activo y sea del negocio.
import { catalogNameProblem } from "../catalog/names";
import { parseMilli } from "../catalog/units";
import { isHalfPercent } from "./portions";

export const PREPARATION_MAX = 4000;
export const NOTE_MAX = 120;

export interface IngredientDraft {
  productId: string;
  /** Cantidad en la presentación elegida, como texto («2.5»). */
  quantity: string;
  presentationId?: string | null;
  note?: string | null;
}

export interface RecipeDraft {
  name: string;
  preparation?: string | null;
  halfPercent?: number;
  ingredients: IngredientDraft[];
}

export type RecipeProblem =
  | { code: "catalog_name_invalid" | "recipe_empty" | "invalid_half_percent" | "validation" }
  | { code: "validation" | "invalid_ingredient_quantity" | "duplicate_ingredient"; index: number };

export function recipeProblem(draft: RecipeDraft): RecipeProblem | null {
  if (catalogNameProblem(draft.name)) return { code: "catalog_name_invalid" };
  if ((draft.preparation ?? "").length > PREPARATION_MAX) return { code: "validation" };
  if (draft.halfPercent !== undefined && !isHalfPercent(draft.halfPercent)) return { code: "invalid_half_percent" };
  if (draft.ingredients.length === 0) return { code: "recipe_empty" };
  const seen = new Set<string>();
  for (const [index, ing] of draft.ingredients.entries()) {
    if (!ing.productId || (ing.note ?? "").length > NOTE_MAX) return { code: "validation", index };
    const qty = parseMilli(ing.quantity ?? "");
    if (qty === null || qty === 0n) return { code: "invalid_ingredient_quantity", index };
    if (seen.has(ing.productId)) return { code: "duplicate_ingredient", index };
    seen.add(ing.productId);
  }
  return null;
}
