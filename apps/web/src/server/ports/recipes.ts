// Repositorios del recetario (spec 004) como puertos; `server/adapters/drizzle/recipes.ts` los implementa.
import type { Recipe, RecipeIngredient, RecipeTemplate, RecipeTemplateItem, SupplyCalculation, SupplyCalculationItem, SupplyCalculationLine } from "@/db/schema";

export type NewRecipe = { businessId: string; name: string; nameKey: string; preparation: string | null; halfPercent: number; createdBy: string | null; createdAt: Date };
export type RecipePatch = Partial<Pick<Recipe, "name" | "nameKey" | "preparation" | "halfPercent" | "archivedAt">> & { updatedAt: Date };
export type IngredientRow = { productId: string; quantityBase: string; note: string | null };

export type NewCalculation = {
  businessId: string;
  branchId: string;
  createdBy: string;
  createdAt: Date;
  items: Omit<SupplyCalculationItem, "id" | "calculationId">[];
  lines: Omit<SupplyCalculationLine, "id" | "calculationId" | "position">[];
};
export type CalculationSummary = SupplyCalculation & { authorName: string; dishes: number; pieces: number; halves: number };

export type NewTemplate = { businessId: string; branchId: string; name: string; nameKey: string; createdBy: string; createdAt: Date };
export type TemplatePatch = Partial<Pick<RecipeTemplate, "name" | "nameKey" | "archivedAt">> & { updatedAt: Date };
export type TemplateItemRow = { recipeId: string; fullCount: number; halfCount: number };

export interface RecipesRepo {
  recipes: {
    listByBusiness(businessId: string): Promise<Recipe[]>;
    findById(id: string): Promise<Recipe | null>;
    insert(data: NewRecipe): Promise<Recipe>;
    update(id: string, patch: RecipePatch): Promise<Recipe>;
  };
  ingredients: {
    listByRecipe(recipeId: string): Promise<RecipeIngredient[]>;
    listByBusiness(businessId: string): Promise<RecipeIngredient[]>;
    /** Sustituye todos los ingredientes de la receta, en el orden dado. */
    replace(recipeId: string, rows: IngredientRow[]): Promise<RecipeIngredient[]>;
  };
  calculations: {
    insert(data: NewCalculation): Promise<SupplyCalculation>;
    listByBranch(branchId: string): Promise<CalculationSummary[]>;
    findById(id: string): Promise<SupplyCalculation | null>;
    items(calculationId: string): Promise<SupplyCalculationItem[]>;
    lines(calculationId: string): Promise<SupplyCalculationLine[]>;
  };
  templates: {
    listByBranch(branchId: string): Promise<RecipeTemplate[]>;
    findById(id: string): Promise<RecipeTemplate | null>;
    insert(data: NewTemplate): Promise<RecipeTemplate>;
    update(id: string, patch: TemplatePatch): Promise<RecipeTemplate>;
    items(templateId: string): Promise<RecipeTemplateItem[]>;
    replaceItems(templateId: string, rows: TemplateItemRow[]): Promise<RecipeTemplateItem[]>;
  };
}
