// Vistas del recetario (spec 004) que reciben las pantallas y la API: textos listos para mostrar, sin `bigint`.
import type { ProductPresentation, Product, SupplyCalculationLine } from "@/db/schema";
import type { BaseUnit } from "@/domain/catalog/units";
import { dbToMicro, dbToMilli, formatMilli, fromBaseMicro } from "@/domain/catalog/units";
import { dbToCentiMicro, formatSupply, type SupplyLine } from "@/domain/recipes/supplies";

export interface RecipeSummary {
  id: string;
  name: string;
  halfPercent: number;
  archived: boolean;
  ingredientCount: number;
  hasArchivedIngredient: boolean;
}

export interface IngredientView {
  productId: string;
  productName: string;
  baseUnit: BaseUnit;
  /** Cantidad en la unidad base (RF-15). */
  quantity: string;
  /** La misma cantidad en la presentación de conteo, si no es la unidad base (RF-15). */
  count: { name: string; quantity: string } | null;
  note: string | null;
  archived: boolean;
}

export interface RecipeDetail {
  id: string;
  name: string;
  preparation: string | null;
  halfPercent: number;
  archived: boolean;
  ingredients: IngredientView[];
}

export interface SupplyLineView {
  productId: string;
  name: string;
  baseUnit: BaseUnit;
  /** Total exacto en la unidad base, con hasta 3 decimales (RF-24). */
  total: string;
  /** Presentaciones de compra redondeadas hacia arriba (RF-25). */
  purchase: { name: string; factor: string; count: number } | null;
  archived: boolean;
}

export interface CalculationItemView {
  recipeId: string;
  recipeName: string;
  full: number;
  half: number;
  halfPercent: number;
}

export interface CalculationView {
  id: string;
  createdAt: string;
  authorName: string;
  items: CalculationItemView[];
  lines: SupplyLineView[];
}

export interface CalculationSummaryView {
  id: string;
  createdAt: string;
  authorName: string;
  dishes: number;
  pieces: number;
  halves: number;
}

export interface TemplateView {
  id: string;
  name: string;
  archived: boolean;
}

export interface PiecesItem {
  recipeId: string;
  full: number;
  half: number;
}

export const supplyLineView = (l: SupplyLine): SupplyLineView => ({
  productId: l.productId,
  name: l.name,
  baseUnit: l.baseUnit,
  total: formatSupply(l.totalCentiMicro),
  purchase: l.purchase ? { name: l.purchase.name, factor: formatMilli(l.purchase.factorMilli), count: Number(l.purchase.count) } : null,
  archived: l.archived,
});

export const savedLineView = (l: SupplyCalculationLine): SupplyLineView => ({
  productId: l.productId,
  name: l.productName,
  baseUnit: l.baseUnit,
  total: formatSupply(dbToCentiMicro(l.totalBase)),
  purchase: l.purchaseName && l.purchaseFactor && l.purchaseCount !== null ? { name: l.purchaseName, factor: formatMilli(dbToMilli(l.purchaseFactor)), count: l.purchaseCount } : null,
  archived: l.productArchived,
});

export function ingredientView(row: { productId: string; quantityBase: string; note: string | null }, product: Product, presentations: ProductPresentation[]): IngredientView {
  const micro = dbToMicro(row.quantityBase);
  const count = presentations.find((p) => p.id === product.countPresentationId);
  return {
    productId: product.id,
    productName: product.name,
    baseUnit: product.baseUnit,
    quantity: formatMilli(fromBaseMicro(micro, 1000n)),
    count: count ? { name: count.name, quantity: formatMilli(fromBaseMicro(micro, dbToMilli(count.factor))) } : null,
    note: row.note,
    archived: product.archivedAt !== null,
  };
}
