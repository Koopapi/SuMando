// Recetas del negocio (spec 004, RF-1, RF-3, RF-4, RF-6 a RF-15, RF-17 a RF-19, RF-49 a RF-55). Todo dentro del
// negocio de la sucursal activa, con el permiso del catálogo y cada cambio en el registro.
import type { Product, ProductPresentation, Recipe, RecipeIngredient } from "@/db/schema";
import { CATALOG_NAME_MAX } from "@/domain/catalog/names";
import { dbToMilli, formatMilli, microToDb, parseMilli, toBaseMicro } from "@/domain/catalog/units";
import { DEFAULT_HALF_PERCENT } from "@/domain/recipes/portions";
import { recipeProblem, NOTE_MAX, PREPARATION_MAX, type RecipeDraft } from "@/domain/recipes/recipe";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { recordAudit } from "../audit";
import { businessLock, catalogAccess, catalogName, inBusiness, optionalText, withDuplicateGuard, type CatalogAccess, type CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { ingredientView, type RecipeDetail, type RecipeSummary } from "./views";

export type RecipeInput = RecipeDraft;

const snapshot = (r: Recipe, ingredients: RecipeIngredient[]) => ({
  id: r.id,
  name: r.name,
  preparation: r.preparation,
  halfPercent: r.halfPercent,
  archivedAt: r.archivedAt,
  ingredients: ingredients.map((i) => ({ productId: i.productId, quantityBase: i.quantityBase, note: i.note })),
});

function assertDraft(draft: RecipeDraft) {
  const problem = recipeProblem(draft);
  if (!problem) return;
  if (problem.code === "catalog_name_invalid") throw new AppError("catalog_name_invalid", { max: CATALOG_NAME_MAX });
  throw new AppError(problem.code);
}

async function businessProducts(repos: Repos, businessId: string) {
  const [products, presentations] = await Promise.all([repos.catalog.products.listByBusiness(businessId), repos.catalog.presentations.listByBusiness(businessId)]);
  return { products: new Map(products.map((p) => [p.id, p])), presentations };
}

export async function detailOf(repos: Repos, recipe: Recipe): Promise<RecipeDetail> {
  const [rows, { products, presentations }] = await Promise.all([repos.recipes.ingredients.listByRecipe(recipe.id), businessProducts(repos, recipe.businessId)]);
  return {
    id: recipe.id,
    name: recipe.name,
    preparation: recipe.preparation,
    halfPercent: recipe.halfPercent,
    archived: recipe.archivedAt !== null,
    ingredients: rows.map((row) => ingredientView(row, products.get(row.productId)!, presentations)),
  };
}

/** Ingredientes validados contra el catálogo del negocio, convertidos a unidad base (RF-8, RF-9). */
function ingredientRows(draft: RecipeDraft, products: Map<string, Product>, presentations: ProductPresentation[], previous: Set<string>) {
  return draft.ingredients.map((ing) => {
    const product = products.get(ing.productId);
    if (!product) throw new AppError("not_found");
    // Un producto archivado no se añade; si la receta ya lo tenía, se conserva (RF-14).
    if (product.archivedAt && !previous.has(product.id)) throw new AppError("product_archived");
    let factor = 1000n;
    if (ing.presentationId) {
      const p = presentations.find((x) => x.id === ing.presentationId);
      if (!p || p.productId !== product.id) throw new AppError("validation");
      factor = dbToMilli(p.factor);
    }
    return { productId: product.id, quantityBase: microToDb(toBaseMicro(parseMilli(ing.quantity)!, factor)), note: optionalText(ing.note, NOTE_MAX) };
  });
}

async function nameClash(repos: Repos, access: CatalogAccess, nameKey: string, exceptId?: string) {
  const all = await repos.recipes.recipes.listByBusiness(access.businessId);
  return all.some((r) => r.id !== exceptId && !r.archivedAt && r.nameKey === nameKey);
}

export async function listRecipes(ctx: Ctx, scope: CatalogScope): Promise<RecipeSummary[]> {
  const access = await catalogAccess(ctx.store, scope);
  const [recipes, ingredients, { products }] = await Promise.all([ctx.store.recipes.recipes.listByBusiness(access.businessId), ctx.store.recipes.ingredients.listByBusiness(access.businessId), businessProducts(ctx.store, access.businessId)]);
  return recipes.map((r) => {
    const own = ingredients.filter((i) => i.recipeId === r.id);
    return { id: r.id, name: r.name, halfPercent: r.halfPercent, archived: r.archivedAt !== null, ingredientCount: own.length, hasArchivedIngredient: own.some((i) => products.get(i.productId)?.archivedAt) };
  });
}

export async function recipeDetail(ctx: Ctx, scope: CatalogScope, id: string): Promise<RecipeDetail> {
  const access = await catalogAccess(ctx.store, scope);
  return detailOf(ctx.store, inBusiness(await ctx.store.recipes.recipes.findById(id), access));
}

export async function createRecipe(ctx: Ctx, scope: CatalogScope, draft: RecipeInput): Promise<RecipeDetail> {
  assertDraft(draft);
  const { name, nameKey } = catalogName(draft.name);
  const preparation = optionalText(draft.preparation, PREPARATION_MAX);
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(
      async (repos) => {
        const access = await catalogAccess(repos, scope);
        const { products, presentations } = await businessProducts(repos, access.businessId);
        const rows = ingredientRows(draft, products, presentations, new Set());
        if (await nameClash(repos, access, nameKey)) throw new AppError("duplicate_name");
        const recipe = await repos.recipes.recipes.insert({ businessId: access.businessId, name, nameKey, preparation, halfPercent: draft.halfPercent ?? DEFAULT_HALF_PERCENT, createdBy: scope.actor.id, createdAt: now });
        const saved = await repos.recipes.ingredients.replace(recipe.id, rows);
        await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "recipe.created", entityType: "recipe", entityId: recipe.id, businessId: access.businessId, after: snapshot(recipe, saved) });
        return detailOf(repos, recipe);
      },
      { lock: businessLock(scope.active.business.id) },
    ),
  );
}

/** Sustituye la receta completa (plan, sección 5): nombre, preparación, media porción e ingredientes. */
export async function updateRecipe(ctx: Ctx, scope: CatalogScope, id: string, draft: RecipeInput): Promise<RecipeDetail> {
  assertDraft(draft);
  const { name, nameKey } = catalogName(draft.name);
  const preparation = optionalText(draft.preparation, PREPARATION_MAX);
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(
      async (repos) => {
        const access = await catalogAccess(repos, scope);
        const before = inBusiness(await repos.recipes.recipes.findById(id), access);
        const previousRows = await repos.recipes.ingredients.listByRecipe(id);
        const { products, presentations } = await businessProducts(repos, access.businessId);
        const rows = ingredientRows(draft, products, presentations, new Set(previousRows.map((r) => r.productId)));
        if (!before.archivedAt && (await nameClash(repos, access, nameKey, id))) throw new AppError("duplicate_name");
        const after = await repos.recipes.recipes.update(id, { name, nameKey, preparation, halfPercent: draft.halfPercent ?? before.halfPercent, updatedAt: now });
        const saved = await repos.recipes.ingredients.replace(id, rows);
        await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "recipe.updated", entityType: "recipe", entityId: id, businessId: access.businessId, before: snapshot(before, previousRows), after: snapshot(after, saved) });
        return detailOf(repos, after);
      },
      { lock: businessLock(scope.active.business.id) },
    ),
  );
}

export async function setRecipeArchived(ctx: Ctx, scope: CatalogScope, id: string, archived: boolean): Promise<RecipeDetail> {
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(
    async (repos) => {
      const access = await catalogAccess(repos, scope);
      const before = inBusiness(await repos.recipes.recipes.findById(id), access);
      if ((before.archivedAt !== null) === archived) return detailOf(repos, before);
      if (!archived && (await nameClash(repos, access, before.nameKey, id))) throw new AppError("duplicate_name");
      const after = await repos.recipes.recipes.update(id, { archivedAt: archived ? now : null, updatedAt: now });
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: archived ? "recipe.archived" : "recipe.reactivated", entityType: "recipe", entityId: id, businessId: access.businessId, before: { archivedAt: before.archivedAt }, after: { archivedAt: after.archivedAt } });
      return detailOf(repos, after);
    },
    { lock: businessLock(scope.active.business.id) },
  );
}

/** Recetas activas que usan un producto, para su detalle en el catálogo (RF-55). */
export async function recipesUsingProduct(ctx: Ctx, scope: CatalogScope, productId: string): Promise<{ id: string; name: string }[]> {
  const access = await catalogAccess(ctx.store, scope);
  const [recipes, ingredients] = await Promise.all([ctx.store.recipes.recipes.listByBusiness(access.businessId), ctx.store.recipes.ingredients.listByBusiness(access.businessId)]);
  const using = new Set(ingredients.filter((i) => i.productId === productId).map((i) => i.recipeId));
  return recipes.filter((r) => !r.archivedAt && using.has(r.id)).map((r) => ({ id: r.id, name: r.name }));
}

export interface EditorProduct {
  id: string;
  name: string;
  baseUnit: Product["baseUnit"];
  presentations: { id: string; name: string; factor: string }[];
}

/** Productos activos del negocio con sus presentaciones, para elegir ingredientes (RF-8, RF-9). */
export async function recipeEditorProducts(ctx: Ctx, scope: CatalogScope): Promise<EditorProduct[]> {
  const access = await catalogAccess(ctx.store, scope);
  const { products, presentations } = await businessProducts(ctx.store, access.businessId);
  return [...products.values()]
    .filter((p) => !p.archivedAt)
    .map((p) => ({
      id: p.id,
      name: p.name,
      baseUnit: p.baseUnit,
      presentations: presentations.filter((x) => x.productId === p.id).map((x) => ({ id: x.id, name: x.name, factor: formatMilli(dbToMilli(x.factor)) })),
    }));
}
