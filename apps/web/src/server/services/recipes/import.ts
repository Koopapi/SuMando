// Importar recetas desde Excel (spec 004, RF-40 a RF-48). Sin estado entre pasos (plan, sección 5): la revisión
// analiza el archivo; la confirmación lo analiza de nuevo y guarda solo los platillos listos.
import { catalogKey } from "@/domain/catalog/names";
import { microToDb } from "@/domain/catalog/units";
import { analyzeSheets, type ImportDish, type ImportProblem } from "@/domain/recipes/import";
import { DEFAULT_HALF_PERCENT } from "@/domain/recipes/portions";
import { readWorkbook } from "../../adapters/xlsx";
import type { Repos } from "../../ports";
import { recordAudit } from "../audit";
import { businessLock, catalogAccess, type CatalogAccess, type CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";

export interface ImportDishView {
  sheet: string;
  name: string;
  status: ImportDish["status"];
  problems: ImportProblem[];
}

async function analyze(repos: Repos, access: CatalogAccess, file: Buffer): Promise<ImportDish[]> {
  const book = readWorkbook(file);
  const [products, recipes] = await Promise.all([repos.catalog.products.listByBusiness(access.businessId), repos.recipes.recipes.listByBusiness(access.businessId)]);
  return analyzeSheets(
    book.sheets,
    products.filter((p) => !p.archivedAt).map((p) => ({ id: p.id, name: p.name, baseUnit: p.baseUnit })),
    recipes.filter((r) => !r.archivedAt).map((r) => r.nameKey),
  );
}

export async function reviewImport(ctx: Ctx, scope: CatalogScope, file: Buffer): Promise<{ dishes: ImportDishView[] }> {
  const access = await catalogAccess(ctx.store, scope);
  const dishes = await analyze(ctx.store, access, file);
  return { dishes: dishes.map(({ sheet, name, status, problems }) => ({ sheet, name, status, problems })) };
}

export async function confirmImport(ctx: Ctx, scope: CatalogScope, file: Buffer): Promise<{ imported: number; skipped: number }> {
  readWorkbook(file);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(
    async (repos) => {
      const access = await catalogAccess(repos, scope);
      const dishes = await analyze(repos, access, file);
      let imported = 0;
      for (const dish of dishes) {
        if (dish.status !== "ready" || !dish.recipe) continue;
        const { name, preparation, ingredients } = dish.recipe;
        const recipe = await repos.recipes.recipes.insert({ businessId: access.businessId, name, nameKey: catalogKey(name), preparation, halfPercent: DEFAULT_HALF_PERCENT, createdBy: scope.actor.id, createdAt: now });
        const rows = await repos.recipes.ingredients.replace(
          recipe.id,
          ingredients.map((i) => ({ productId: i.productId, quantityBase: microToDb(i.quantityMicro), note: i.note })),
        );
        await recordAudit(repos.audit, now, {
          actorId: scope.actor.id,
          action: "recipe.imported",
          entityType: "recipe",
          entityId: recipe.id,
          businessId: access.businessId,
          after: { name, preparation, halfPercent: DEFAULT_HALF_PERCENT, ingredients: rows.map((r) => ({ productId: r.productId, quantityBase: r.quantityBase, note: r.note })) },
        });
        imported++;
      }
      return { imported, skipped: dishes.length - imported };
    },
    { lock: businessLock(scope.active.business.id) },
  );
}
