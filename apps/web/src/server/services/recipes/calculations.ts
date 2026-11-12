// Cálculo de insumos e historial (spec 004, RF-2, RF-5, RF-20 a RF-34). El servidor calcula (constitución,
// principio 3); el cálculo guardado lleva copias de lo que usó y no se modifica.
import type { Recipe, SupplyCalculation } from "@/db/schema";
import { dbToMicro, dbToMilli, milliToDb } from "@/domain/catalog/units";
import { parsePieces } from "@/domain/recipes/portions";
import { centiMicroToDb, computeSupplies, type SupplyLine, type SupplyProduct, type SupplyRecipe } from "@/domain/recipes/supplies";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { catalogAccess, type CatalogAccess, type CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { savedLineView, supplyLineView, type CalculationSummaryView, type CalculationView, type PiecesItem, type SupplyLineView } from "./views";

/** Piezas validadas (RF-21): un renglón por receta, completas y medias enteras de 0 a 9,999. */
export function parseItems(raw: unknown): PiecesItem[] {
  if (!Array.isArray(raw)) throw new AppError("validation");
  const seen = new Set<string>();
  return raw.map((item) => {
    const { recipeId, full, half } = (item ?? {}) as Record<string, unknown>;
    if (typeof recipeId !== "string" || !recipeId || seen.has(recipeId)) throw new AppError("validation");
    seen.add(recipeId);
    const f = typeof full === "number" || typeof full === "string" ? parsePieces(full) : null;
    const h = typeof half === "number" || typeof half === "string" ? parsePieces(half) : null;
    if (f === null || h === null) throw new AppError("invalid_pieces");
    return { recipeId, full: f, half: h };
  });
}

interface Book {
  recipes: Map<string, Recipe>;
  supplyRecipes: Map<string, SupplyRecipe>;
  products: Map<string, SupplyProduct>;
}

/** Recetas activas del negocio con sus ingredientes y los productos con su presentación de compra. */
async function loadBook(repos: Repos, access: CatalogAccess): Promise<Book> {
  const [recipes, ingredients, products, presentations] = await Promise.all([
    repos.recipes.recipes.listByBusiness(access.businessId),
    repos.recipes.ingredients.listByBusiness(access.businessId),
    repos.catalog.products.listByBusiness(access.businessId),
    repos.catalog.presentations.listByBusiness(access.businessId),
  ]);
  const active = recipes.filter((r) => !r.archivedAt);
  const supplyRecipes = new Map<string, SupplyRecipe>(
    active.map((r) => [r.id, { id: r.id, halfPercent: r.halfPercent, ingredients: ingredients.filter((i) => i.recipeId === r.id).map((i) => ({ productId: i.productId, quantityMicro: dbToMicro(i.quantityBase) })) }]),
  );
  const supplyProducts = new Map<string, SupplyProduct>(
    products.map((p) => {
      const purchase = presentations.find((x) => x.id === p.purchasePresentationId);
      return [p.id, { id: p.id, name: p.name, baseUnit: p.baseUnit, archived: p.archivedAt !== null, purchase: purchase ? { name: purchase.name, factorMilli: dbToMilli(purchase.factor) } : null }];
    }),
  );
  return { recipes: new Map(active.map((r) => [r.id, r])), supplyRecipes, products: supplyProducts };
}

function compute(book: Book, items: PiecesItem[]): SupplyLine[] {
  // Una receta de otro negocio o archivada no existe para el cálculo (RF-6, RF-51).
  for (const item of items) if (!book.recipes.has(item.recipeId)) throw new AppError("not_found");
  return computeSupplies(book.supplyRecipes, book.products, items);
}

/** Recetas activas para capturar piezas (RF-20). */
export async function calculationBoard(ctx: Ctx, scope: CatalogScope): Promise<{ recipes: { id: string; name: string; halfPercent: number }[] }> {
  const access = await catalogAccess(ctx.store, scope);
  const recipes = await ctx.store.recipes.recipes.listByBusiness(access.businessId);
  return { recipes: recipes.filter((r) => !r.archivedAt).map((r) => ({ id: r.id, name: r.name, halfPercent: r.halfPercent })) };
}

/** Lista de insumos sin guardar (RF-22 a RF-27). */
export async function previewSupplies(ctx: Ctx, scope: CatalogScope, raw: unknown): Promise<SupplyLineView[]> {
  const items = parseItems(raw);
  const access = await catalogAccess(ctx.store, scope);
  return compute(await loadBook(ctx.store, access), items).map(supplyLineView);
}

export async function saveCalculation(ctx: Ctx, scope: CatalogScope, raw: unknown): Promise<SupplyCalculation> {
  const items = parseItems(raw).filter((i) => i.full > 0 || i.half > 0);
  if (items.length === 0) throw new AppError("calculation_empty");
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const access = await catalogAccess(repos, scope);
    const book = await loadBook(repos, access);
    const lines = compute(book, items);
    return repos.recipes.calculations.insert({
      businessId: access.businessId,
      branchId: scope.active.branch.id,
      createdBy: scope.actor.id,
      createdAt: now,
      items: items.map((i) => {
        const r = book.recipes.get(i.recipeId)!;
        return { recipeId: r.id, recipeName: r.name, fullCount: i.full, halfCount: i.half, halfPercent: r.halfPercent };
      }),
      lines: lines.map((l) => ({
        productId: l.productId,
        productName: l.name,
        baseUnit: l.baseUnit,
        totalBase: centiMicroToDb(l.totalCentiMicro),
        purchaseName: l.purchase?.name ?? null,
        purchaseFactor: l.purchase ? milliToDb(l.purchase.factorMilli) : null,
        purchaseCount: l.purchase ? Number(l.purchase.count) : null,
        productArchived: l.archived,
      })),
    });
  });
}

/** Un cálculo de la sucursal activa; de otra sucursal o negocio no existe (RF-5, RF-6). */
async function ownCalculation(repos: Repos, scope: CatalogScope, id: string): Promise<SupplyCalculation> {
  await catalogAccess(repos, scope);
  const calc = await repos.recipes.calculations.findById(id);
  if (!calc || calc.branchId !== scope.active.branch.id) throw new AppError("not_found");
  return calc;
}

export async function listCalculations(ctx: Ctx, scope: CatalogScope): Promise<CalculationSummaryView[]> {
  await catalogAccess(ctx.store, scope);
  const rows = await ctx.store.recipes.calculations.listByBranch(scope.active.branch.id);
  return rows.map((c) => ({ id: c.id, createdAt: c.createdAt.toISOString(), authorName: c.authorName, dishes: c.dishes, pieces: c.pieces, halves: c.halves }));
}

/** El cálculo tal como se guardó (RF-32). */
export async function calculationDetail(ctx: Ctx, scope: CatalogScope, id: string): Promise<CalculationView> {
  const calc = await ownCalculation(ctx.store, scope, id);
  const [items, lines, author] = await Promise.all([ctx.store.recipes.calculations.items(id), ctx.store.recipes.calculations.lines(id), ctx.store.users.findById(calc.createdBy)]);
  return {
    id: calc.id,
    createdAt: calc.createdAt.toISOString(),
    authorName: author?.name ?? "",
    items: items.map((i) => ({ recipeId: i.recipeId, recipeName: i.recipeName, full: i.fullCount, half: i.halfCount, halfPercent: i.halfPercent })),
    lines: lines.map(savedLineView),
  };
}

/** Piezas vigentes para empezar otro cálculo: deja fuera las recetas archivadas y dice cuáles (RF-33, RF-34, RF-39). */
export async function currentPieces(repos: Repos, access: CatalogAccess, items: { recipeId: string; full: number; half: number; name?: string }[]) {
  const recipes = new Map((await repos.recipes.recipes.listByBusiness(access.businessId)).map((r) => [r.id, r]));
  const kept: PiecesItem[] = [];
  const dropped: string[] = [];
  for (const i of items) {
    const r = recipes.get(i.recipeId);
    if (r && !r.archivedAt) kept.push({ recipeId: i.recipeId, full: i.full, half: i.half });
    else dropped.push(r?.name ?? i.name ?? "");
  }
  return { items: kept, dropped };
}

export async function calculationBase(ctx: Ctx, scope: CatalogScope, id: string): Promise<{ items: PiecesItem[]; dropped: string[] }> {
  const calc = await ownCalculation(ctx.store, scope, id);
  const access = await catalogAccess(ctx.store, scope);
  const items = await ctx.store.recipes.calculations.items(calc.id);
  return currentPieces(ctx.store, access, items.map((i) => ({ recipeId: i.recipeId, full: i.fullCount, half: i.halfCount, name: i.recipeName })));
}
