// Plantillas de compra (spec 007, RF-18 a RF-20): renglones guardados con nombre, propios de la sucursal.
import type { PurchaseTemplate } from "@/db/schema";
import { microToDb } from "@/domain/catalog/units";
import { mergeLines } from "@/domain/requisitions/suggest";
import { lineToBase, parseLineQuantity } from "@/domain/inventory/quantities";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { recordAudit } from "../audit";
import { catalogName, type CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { activeProduct, inventoryAccess, loadBook, presentationFactor, uuidOrNotFound } from "../inventory/shared";

export interface TemplateView {
  id: string;
  name: string;
  archived: boolean;
  lines: number;
}

async function ownTemplate(repos: Repos, scope: CatalogScope, id: string): Promise<PurchaseTemplate> {
  const t = await repos.requisitions.templates.findById(uuidOrNotFound(id));
  if (!t || t.branchId !== scope.active.branch.id) throw new AppError("not_found");
  return t;
}

export async function listPurchaseTemplates(ctx: Ctx, scope: CatalogScope): Promise<TemplateView[]> {
  await inventoryAccess(ctx.store, scope);
  const list = await ctx.store.requisitions.templates.listByBranch(scope.active.branch.id);
  return Promise.all(list.map(async (t) => ({ id: t.id, name: t.name, archived: t.archivedAt !== null, lines: (await ctx.store.requisitions.templates.items(t.id)).length })));
}

/** RF-18: guarda los renglones con nombre; si ya hay una activa con ese nombre, pide confirmar el reemplazo. */
export async function savePurchaseTemplate(ctx: Ctx, scope: CatalogScope, input: { name: string; lines: unknown; replace?: boolean }): Promise<PurchaseTemplate> {
  const { name, nameKey } = catalogName(input.name);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const access = await inventoryAccess(repos, scope);
    const book = await loadBook(repos, access.businessId);
    if (!Array.isArray(input.lines) || input.lines.length === 0) throw new AppError("requisition_empty");
    const suppliers = new Set((await repos.catalog.suppliers.listByBusiness(access.businessId)).filter((s) => !s.archivedAt).map((s) => s.id));
    const lines = mergeLines(
      (input.lines as Record<string, unknown>[]).map((l) => {
        const product = activeProduct(book, l?.productId);
        const qty = typeof l.quantity === "string" ? parseLineQuantity(l.quantity) : null;
        if (qty === null) throw new AppError("invalid_line_quantity");
        const presentationId = typeof l.presentationId === "string" && l.presentationId ? l.presentationId : null;
        const supplierId = typeof l.supplierId === "string" && suppliers.has(l.supplierId) ? l.supplierId : null;
        return { productId: product.id, presentationId, supplierId, quantityMicro: lineToBase(qty, presentationFactor(book, product, presentationId)) };
      }),
    );
    const existing = (await repos.requisitions.templates.listByBranch(scope.active.branch.id)).find((t) => !t.archivedAt && t.nameKey === nameKey);
    if (existing && !input.replace) throw new AppError("template_exists");
    const t = existing ?? (await repos.requisitions.templates.insert({ businessId: access.businessId, branchId: scope.active.branch.id, name, nameKey, createdBy: scope.actor.id, createdAt: now }));
    await repos.requisitions.templates.replaceItems(
      t.id,
      lines.map((l) => ({ productId: l.productId, presentationId: l.presentationId, supplierId: l.supplierId, quantityBase: microToDb(l.quantityMicro) })),
    );
    await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: existing ? "purchase_template.replaced" : "purchase_template.created", entityType: "purchase_template", entityId: t.id, businessId: access.businessId, branchId: t.branchId, after: { name: t.name, lines: lines.length } });
    return t;
  });
}

/** RF-20: renombrar, sin repetir el nombre de otra activa. */
export async function renamePurchaseTemplate(ctx: Ctx, scope: CatalogScope, id: string, rawName: string): Promise<PurchaseTemplate> {
  const { name, nameKey } = catalogName(rawName);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const access = await inventoryAccess(repos, scope);
    const t = await ownTemplate(repos, scope, id);
    const clash = (await repos.requisitions.templates.listByBranch(t.branchId)).some((x) => x.id !== t.id && !x.archivedAt && x.nameKey === nameKey);
    if (clash && !t.archivedAt) throw new AppError("duplicate_name");
    const after = await repos.requisitions.templates.update(t.id, { name, nameKey, updatedAt: now });
    await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "purchase_template.renamed", entityType: "purchase_template", entityId: t.id, businessId: access.businessId, branchId: t.branchId, before: { name: t.name }, after: { name } });
    return after;
  });
}

export async function setPurchaseTemplateArchived(ctx: Ctx, scope: CatalogScope, id: string, archived: boolean): Promise<PurchaseTemplate> {
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const access = await inventoryAccess(repos, scope);
    const t = await ownTemplate(repos, scope, id);
    if (!archived && (await repos.requisitions.templates.listByBranch(t.branchId)).some((x) => x.id !== t.id && !x.archivedAt && x.nameKey === t.nameKey)) throw new AppError("duplicate_name");
    const after = await repos.requisitions.templates.update(t.id, { archivedAt: archived ? now : null, updatedAt: now });
    await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: archived ? "purchase_template.archived" : "purchase_template.reactivated", entityType: "purchase_template", entityId: t.id, businessId: access.businessId, branchId: t.branchId });
    return after;
  });
}
