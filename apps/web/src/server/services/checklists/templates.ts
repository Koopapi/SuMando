// Plantillas de checklist (spec 010, RF-1, RF-2, RF-6 a RF-14, RF-49). Se guardan completas: secciones y puntos en
// el orden del arreglo; lo que existía y no llega se archiva. Ninguna hoja ya abierta cambia (copian al abrir).
import type { ChecklistItem, ChecklistSection, ChecklistTemplate } from "@/db/schema";
import { canBeKey, daysToMask, isItemKind, ITEM_TEXT_MAX, maskToDays, SECTION_NAME_MAX, validDays, type ItemKind } from "@/domain/checklists/template";
import { normalizeName } from "@/domain/text";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { recordAudit } from "../audit";
import { catalogAccess, catalogName, withDuplicateGuard, type CatalogAccess, type CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { uuidOrNotFound } from "../inventory/shared";

export interface TemplateItemView {
  id: string;
  text: string;
  kind: ItemKind;
  isKey: boolean;
}

export interface TemplateSectionView {
  id: string;
  name: string;
  positionId: string | null;
  items: TemplateItemView[];
}

export interface TemplateView {
  id: string;
  name: string;
  archived: boolean;
  days: number[];
  branchIds: string[];
  sections: TemplateSectionView[];
}

export interface TemplateSummaryView {
  id: string;
  name: string;
  archived: boolean;
  days: number[];
  branches: string[];
  sections: number;
  items: number;
}

export interface TemplateInput {
  name: unknown;
  days: unknown;
  branchIds: unknown;
  sections: unknown;
}

interface CleanSection {
  id: string | null;
  name: string;
  positionId: string | null;
  items: { id: string | null; text: string; kind: ItemKind; isKey: boolean }[];
}

export const templatesAccess = (repos: Repos, scope: CatalogScope) => catalogAccess(repos, scope);

async function ownTemplate(repos: Repos, access: CatalogAccess, id: unknown): Promise<ChecklistTemplate> {
  const t = await repos.checklists.templates.findById(uuidOrNotFound(id));
  if (!t || t.businessId !== access.businessId) throw new AppError("not_found");
  return t;
}

const activeOf = <T extends { archivedAt: Date | null }>(list: T[]) => list.filter((x) => !x.archivedAt);

export async function templateView(repos: Repos, t: ChecklistTemplate): Promise<TemplateView> {
  const [branches, sections] = await Promise.all([repos.checklists.templateBranches.listByTemplates([t.id]), repos.checklists.sections.listByTemplates([t.id])]);
  const live = activeOf(sections);
  const items = activeOf(await repos.checklists.items.listBySections(live.map((s) => s.id)));
  return {
    id: t.id,
    name: t.name,
    archived: t.archivedAt !== null,
    days: maskToDays(t.daysMask),
    branchIds: branches.map((b) => b.branchId),
    sections: live.map((s) => ({ id: s.id, name: s.name, positionId: s.positionId, items: items.filter((i) => i.sectionId === s.id).map((i) => ({ id: i.id, text: i.text, kind: i.kind, isKey: i.isKey })) })),
  };
}

/** Plantillas del negocio de la sucursal activa (RF-1). */
export async function listTemplates(ctx: Ctx, scope: CatalogScope): Promise<TemplateSummaryView[]> {
  const access = await templatesAccess(ctx.store, scope);
  const templates = await ctx.store.checklists.templates.listByBusiness(access.businessId);
  const ids = templates.map((t) => t.id);
  const [links, sections] = await Promise.all([ctx.store.checklists.templateBranches.listByTemplates(ids), ctx.store.checklists.sections.listByTemplates(ids)]);
  const live = activeOf(sections);
  const items = activeOf(await ctx.store.checklists.items.listBySections(live.map((s) => s.id)));
  return templates.map((t) => {
    const mine = live.filter((s) => s.templateId === t.id);
    return {
      id: t.id,
      name: t.name,
      archived: t.archivedAt !== null,
      days: maskToDays(t.daysMask),
      branches: links.filter((l) => l.templateId === t.id).map((l) => access.branches.find((b) => b.id === l.branchId)?.name ?? ""),
      sections: mine.length,
      items: items.filter((i) => mine.some((s) => s.id === i.sectionId)).length,
    };
  });
}

export async function getTemplate(ctx: Ctx, scope: CatalogScope, id: string): Promise<TemplateView> {
  const access = await templatesAccess(ctx.store, scope);
  return templateView(ctx.store, await ownTemplate(ctx.store, access, id));
}

function text(raw: unknown, max: number): string {
  const t = normalizeName(typeof raw === "string" ? raw : "");
  if (!t || t.length > max) throw new AppError("validation");
  return t;
}

const optionalId = (raw: unknown): string | null => (raw === undefined || raw === null || raw === "" ? null : uuidOrNotFound(raw));

async function clean(repos: Repos, access: CatalogAccess, input: TemplateInput) {
  const { name, nameKey } = catalogName(typeof input.name === "string" ? input.name : "");
  const days = validDays(input.days);
  const branchIds = Array.isArray(input.branchIds) ? [...new Set(input.branchIds)] : [];
  if (!days || branchIds.length === 0) throw new AppError("template_scope");
  for (const id of branchIds) {
    const b = access.branches.find((x) => x.id === id);
    if (!b || b.archivedAt) throw new AppError("not_found");
  }
  if (!Array.isArray(input.sections)) throw new AppError("validation");
  const positions = await repos.personnel.positions.listByBusiness(access.businessId);
  const sections: CleanSection[] = input.sections.map((raw) => {
    const s = (raw ?? {}) as Record<string, unknown>;
    const positionId = optionalId(s.positionId);
    if (positionId && !positions.some((p) => p.id === positionId && !p.archivedAt)) throw new AppError("not_found");
    if (!Array.isArray(s.items)) throw new AppError("validation");
    return {
      id: optionalId(s.id),
      name: text(s.name, SECTION_NAME_MAX),
      positionId,
      items: s.items.map((r) => {
        const i = (r ?? {}) as Record<string, unknown>;
        if (!isItemKind(i.kind)) throw new AppError("validation");
        const isKey = i.isKey === true;
        if (isKey && !canBeKey(i.kind)) throw new AppError("validation");
        return { id: optionalId(i.id), text: text(i.text, ITEM_TEXT_MAX), kind: i.kind, isKey };
      }),
    };
  });
  return { name, nameKey, daysMask: daysToMask(days), branchIds: branchIds as string[], sections };
}

/** RF-9 a RF-14: aplica secciones y puntos en su orden; lo que no llega se archiva. */
async function applyStructure(repos: Repos, templateId: string, sections: CleanSection[], now: Date) {
  const existing = await repos.checklists.sections.listByTemplates([templateId]);
  const existingItems = await repos.checklists.items.listBySections(existing.map((s) => s.id));
  const keptSections = new Set<string>();
  const keptItems = new Set<string>();
  for (const [sort, s] of sections.entries()) {
    let section: ChecklistSection;
    if (s.id) {
      const found = existing.find((x) => x.id === s.id);
      if (!found) throw new AppError("not_found");
      section = await repos.checklists.sections.update(found.id, { name: s.name, positionId: s.positionId, sort, archivedAt: null });
    } else section = await repos.checklists.sections.insert({ templateId, name: s.name, positionId: s.positionId, sort });
    keptSections.add(section.id);
    for (const [isort, i] of s.items.entries()) {
      let item: ChecklistItem;
      if (i.id) {
        const found = existingItems.find((x) => x.id === i.id);
        if (!found) throw new AppError("not_found");
        item = await repos.checklists.items.update(found.id, { sectionId: section.id, text: i.text, kind: i.kind, isKey: i.isKey, sort: isort, archivedAt: null });
      } else item = await repos.checklists.items.insert({ sectionId: section.id, text: i.text, kind: i.kind, isKey: i.isKey, sort: isort });
      keptItems.add(item.id);
    }
  }
  for (const s of existing) if (!keptSections.has(s.id) && !s.archivedAt) await repos.checklists.sections.update(s.id, { archivedAt: now });
  for (const i of existingItems) if (!keptItems.has(i.id) && !i.archivedAt) await repos.checklists.items.update(i.id, { archivedAt: now });
}

const audit = (repos: Repos, now: Date, scope: CatalogScope, t: ChecklistTemplate, action: string, after: unknown, before?: unknown) =>
  recordAudit(repos.audit, now, { actorId: scope.actor.id, action, entityType: "checklist_template", entityId: t.id, businessId: t.businessId, before, after });

/** RF-2, RF-6 a RF-11: alta de una plantilla con su estructura. */
export async function createTemplate(ctx: Ctx, scope: CatalogScope, input: TemplateInput): Promise<TemplateView> {
  const access = await templatesAccess(ctx.store, scope);
  const c = await clean(ctx.store, access, input);
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      const t = await repos.checklists.templates.insert({ businessId: access.businessId, name: c.name, nameKey: c.nameKey, daysMask: c.daysMask, createdBy: scope.actor.id, createdAt: now });
      await repos.checklists.templateBranches.replace(t.id, c.branchIds);
      await applyStructure(repos, t.id, c.sections, now);
      const view = await templateView(repos, t);
      await audit(repos, now, scope, t, "checklist_template.created", view);
      return view;
    }),
  );
}

/** RF-12 a RF-14: guardar cambios de la plantilla completa. */
export async function saveTemplate(ctx: Ctx, scope: CatalogScope, id: string, input: TemplateInput): Promise<TemplateView> {
  const access = await templatesAccess(ctx.store, scope);
  const c = await clean(ctx.store, access, input);
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      const t = await ownTemplate(repos, access, id);
      const before = await templateView(repos, t);
      const updated = await repos.checklists.templates.update(t.id, { name: c.name, nameKey: c.nameKey, daysMask: c.daysMask, updatedAt: now });
      await repos.checklists.templateBranches.replace(t.id, c.branchIds);
      await applyStructure(repos, t.id, c.sections, now);
      const view = await templateView(repos, updated);
      await audit(repos, now, scope, t, "checklist_template.updated", view, before);
      return view;
    }),
  );
}

/** RF-2: archivar y reactivar (la reactivación respeta el nombre único entre activas, RF-8). */
export async function setTemplateArchived(ctx: Ctx, scope: CatalogScope, id: string, archived: boolean): Promise<TemplateView> {
  const access = await templatesAccess(ctx.store, scope);
  const now = ctx.ports.clock.now();
  return withDuplicateGuard(() =>
    ctx.store.transaction(async (repos) => {
      const t = await ownTemplate(repos, access, id);
      const updated = await repos.checklists.templates.update(t.id, { archivedAt: archived ? now : null, updatedAt: now });
      await audit(repos, now, scope, t, archived ? "checklist_template.archived" : "checklist_template.reactivated", { archived }, { archived: t.archivedAt !== null });
      return templateView(repos, updated);
    }),
  );
}
