// Plantillas de piezas (spec 004, RF-35 a RF-39, RF-49, RF-50, RF-52, RF-53): con nombre, por sucursal; guardar
// con un nombre ocupado pide confirmar y entonces reemplaza sus piezas.
import type { RecipeTemplate } from "@/db/schema";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { recordAudit } from "../audit";
import { catalogAccess, catalogName, withDuplicateGuard, type CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { currentPieces, parseItems } from "./calculations";
import type { PiecesItem, TemplateView } from "./views";

const view = (t: RecipeTemplate): TemplateView => ({ id: t.id, name: t.name, archived: t.archivedAt !== null });

async function ownTemplate(repos: Repos, scope: CatalogScope, id: string): Promise<RecipeTemplate> {
  await catalogAccess(repos, scope);
  const t = await repos.recipes.templates.findById(id);
  if (!t || t.branchId !== scope.active.branch.id) throw new AppError("not_found");
  return t;
}

export async function listTemplates(ctx: Ctx, scope: CatalogScope): Promise<TemplateView[]> {
  await catalogAccess(ctx.store, scope);
  return (await ctx.store.recipes.templates.listByBranch(scope.active.branch.id)).map(view);
}

export async function saveTemplate(ctx: Ctx, scope: CatalogScope, input: { name: string; items: unknown; replace?: boolean }): Promise<TemplateView> {
  const { name, nameKey } = catalogName(input.name);
  const items = parseItems(input.items).filter((i) => i.full > 0 || i.half > 0);
  if (items.length === 0) throw new AppError("calculation_empty");
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      const access = await catalogAccess(repos, scope);
      const recipes = new Map((await repos.recipes.recipes.listByBusiness(access.businessId)).map((r) => [r.id, r]));
      for (const i of items) if (!recipes.get(i.recipeId) || recipes.get(i.recipeId)!.archivedAt) throw new AppError("not_found");
      const rows = items.map((i) => ({ recipeId: i.recipeId, fullCount: i.full, halfCount: i.half }));
      const existing = (await repos.recipes.templates.listByBranch(scope.active.branch.id)).find((t) => !t.archivedAt && t.nameKey === nameKey);
      if (existing) {
        if (!input.replace) throw new AppError("template_exists");
        const before = await repos.recipes.templates.items(existing.id);
        await repos.recipes.templates.replaceItems(existing.id, rows);
        await repos.recipes.templates.update(existing.id, { updatedAt: now });
        await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "recipe_template.replaced", entityType: "recipe_template", entityId: existing.id, businessId: access.businessId, branchId: scope.active.branch.id, before: before.map(({ recipeId, fullCount, halfCount }) => ({ recipeId, fullCount, halfCount })), after: rows });
        return view(existing);
      }
      const t = await repos.recipes.templates.insert({ businessId: access.businessId, branchId: scope.active.branch.id, name, nameKey, createdBy: scope.actor.id, createdAt: now });
      await repos.recipes.templates.replaceItems(t.id, rows);
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "recipe_template.created", entityType: "recipe_template", entityId: t.id, businessId: access.businessId, branchId: scope.active.branch.id, after: { name, items: rows } });
      return view(t);
    }),
  );
}

export async function renameTemplate(ctx: Ctx, scope: CatalogScope, id: string, rawName: string): Promise<TemplateView> {
  const { name, nameKey } = catalogName(rawName);
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      const before = await ownTemplate(repos, scope, id);
      const all = await repos.recipes.templates.listByBranch(scope.active.branch.id);
      if (!before.archivedAt && all.some((t) => t.id !== id && !t.archivedAt && t.nameKey === nameKey)) throw new AppError("duplicate_name");
      const after = await repos.recipes.templates.update(id, { name, nameKey, updatedAt: now });
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "recipe_template.renamed", entityType: "recipe_template", entityId: id, businessId: before.businessId, branchId: before.branchId, before: { name: before.name }, after: { name } });
      return view(after);
    }),
  );
}

export async function setTemplateArchived(ctx: Ctx, scope: CatalogScope, id: string, archived: boolean): Promise<TemplateView> {
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const before = await ownTemplate(repos, scope, id);
    if ((before.archivedAt !== null) === archived) return view(before);
    if (!archived) {
      const all = await repos.recipes.templates.listByBranch(scope.active.branch.id);
      if (all.some((t) => t.id !== id && !t.archivedAt && t.nameKey === before.nameKey)) throw new AppError("duplicate_name");
    }
    const after = await repos.recipes.templates.update(id, { archivedAt: archived ? now : null, updatedAt: now });
    await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: archived ? "recipe_template.archived" : "recipe_template.reactivated", entityType: "recipe_template", entityId: id, businessId: before.businessId, branchId: before.branchId });
    return view(after);
  });
}

/** Piezas de la plantilla para un cálculo nuevo, sin las recetas archivadas (RF-36, RF-39). */
export async function templateStart(ctx: Ctx, scope: CatalogScope, id: string): Promise<{ template: TemplateView; items: PiecesItem[]; dropped: string[] }> {
  const template = await ownTemplate(ctx.store, scope, id);
  const access = await catalogAccess(ctx.store, scope);
  const items = await ctx.store.recipes.templates.items(id);
  const current = await currentPieces(ctx.store, access, items.map((i) => ({ recipeId: i.recipeId, full: i.fullCount, half: i.halfCount })));
  return { template: view(template), ...current };
}
