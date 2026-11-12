// Implementación con Drizzle de los repositorios del recetario (`server/ports/recipes.ts`).
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { recipeIngredients, recipes, recipeTemplateItems, recipeTemplates, supplyCalculationItems, supplyCalculationLines, supplyCalculations, users } from "@/db/schema";
import type { DbOrTx } from "@/db/client";
import type { RecipesRepo } from "@/server/ports/recipes";

const first = <T>(rows: T[]): T | null => rows[0] ?? null;

export function recipesRepo(db: DbOrTx): RecipesRepo {
  return {
    recipes: {
      listByBusiness: (businessId) => db.select().from(recipes).where(eq(recipes.businessId, businessId)).orderBy(asc(recipes.nameKey)),
      findById: async (id) => first(await db.select().from(recipes).where(eq(recipes.id, id)).limit(1)),
      insert: async (data) => (await db.insert(recipes).values({ ...data, updatedAt: data.createdAt }).returning())[0],
      update: async (id, patch) => (await db.update(recipes).set(patch).where(eq(recipes.id, id)).returning())[0],
    },
    ingredients: {
      listByRecipe: (recipeId) => db.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeId)).orderBy(asc(recipeIngredients.position)),
      listByBusiness: async (businessId) =>
        (
          await db
            .select({ i: recipeIngredients })
            .from(recipeIngredients)
            .innerJoin(recipes, eq(recipes.id, recipeIngredients.recipeId))
            .where(eq(recipes.businessId, businessId))
            .orderBy(asc(recipeIngredients.recipeId), asc(recipeIngredients.position))
        ).map((r) => r.i),
      replace: async (recipeId, rows) => {
        await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeId));
        if (rows.length === 0) return [];
        return db
          .insert(recipeIngredients)
          .values(rows.map((r, position) => ({ ...r, recipeId, position })))
          .returning();
      },
    },
    calculations: {
      insert: async ({ items, lines, ...calc }) => {
        const [row] = await db.insert(supplyCalculations).values(calc).returning();
        if (items.length) await db.insert(supplyCalculationItems).values(items.map((i) => ({ ...i, calculationId: row.id })));
        if (lines.length) await db.insert(supplyCalculationLines).values(lines.map((l, position) => ({ ...l, calculationId: row.id, position })));
        return row;
      },
      listByBranch: async (branchId) =>
        (
          await db
            .select({
              c: supplyCalculations,
              authorName: users.name,
              dishes: sql<number>`(select count(*) from ${supplyCalculationItems} i where i.calculation_id = ${supplyCalculations.id})::int`,
              pieces: sql<number>`(select coalesce(sum(i.full_count), 0) from ${supplyCalculationItems} i where i.calculation_id = ${supplyCalculations.id})::int`,
              halves: sql<number>`(select coalesce(sum(i.half_count), 0) from ${supplyCalculationItems} i where i.calculation_id = ${supplyCalculations.id})::int`,
            })
            .from(supplyCalculations)
            .innerJoin(users, eq(users.id, supplyCalculations.createdBy))
            .where(eq(supplyCalculations.branchId, branchId))
            .orderBy(desc(supplyCalculations.createdAt))
        ).map((r) => ({ ...r.c, authorName: r.authorName, dishes: r.dishes, pieces: r.pieces, halves: r.halves })),
      findById: async (id) => first(await db.select().from(supplyCalculations).where(eq(supplyCalculations.id, id)).limit(1)),
      items: (calculationId) => db.select().from(supplyCalculationItems).where(eq(supplyCalculationItems.calculationId, calculationId)).orderBy(asc(supplyCalculationItems.recipeName)),
      lines: (calculationId) => db.select().from(supplyCalculationLines).where(eq(supplyCalculationLines.calculationId, calculationId)).orderBy(asc(supplyCalculationLines.position)),
    },
    templates: {
      listByBranch: (branchId) => db.select().from(recipeTemplates).where(eq(recipeTemplates.branchId, branchId)).orderBy(asc(recipeTemplates.nameKey)),
      findById: async (id) => first(await db.select().from(recipeTemplates).where(eq(recipeTemplates.id, id)).limit(1)),
      insert: async (data) => (await db.insert(recipeTemplates).values({ ...data, updatedAt: data.createdAt }).returning())[0],
      update: async (id, patch) => (await db.update(recipeTemplates).set(patch).where(eq(recipeTemplates.id, id)).returning())[0],
      items: (templateId) => db.select().from(recipeTemplateItems).where(eq(recipeTemplateItems.templateId, templateId)),
      replaceItems: async (templateId, rows) => {
        await db.delete(recipeTemplateItems).where(and(eq(recipeTemplateItems.templateId, templateId)));
        if (rows.length === 0) return [];
        return db
          .insert(recipeTemplateItems)
          .values(rows.map((r) => ({ ...r, templateId })))
          .returning();
      },
    },
  };
}
