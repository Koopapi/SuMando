// Lista de documentos del negocio (spec 008, RF-16, RF-17): solo el dueño la cambia.
import type { DocumentType } from "@/db/schema";
import { AppError } from "../../errors";
import { recordAudit } from "../audit";
import { businessLock, catalogName, inBusiness, type CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { uuidOrNotFound } from "../inventory/shared";
import { documentTypesOf, ownerOnly, personnelAccess } from "./shared";

export interface DocumentTypeView {
  id: string;
  name: string;
  required: boolean;
  validityMonths: number | null;
  archived: boolean;
}

const view = (d: DocumentType): DocumentTypeView => ({ id: d.id, name: d.name, required: d.required, validityMonths: d.validityMonths, archived: d.archivedAt !== null });

export async function listDocumentTypes(ctx: Ctx, scope: CatalogScope): Promise<DocumentTypeView[]> {
  const access = await personnelAccess(ctx.store, scope);
  return (await documentTypesOf(ctx, access.businessId)).map(view);
}

export interface DocumentTypeInput {
  name?: string;
  required?: unknown;
  validityMonths?: unknown;
}

function validity(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 120) throw new AppError("validation");
  return n;
}

export async function saveDocumentType(ctx: Ctx, scope: CatalogScope, id: string | null, input: DocumentTypeInput): Promise<DocumentTypeView> {
  ownerOnly(scope);
  const named = input.name === undefined ? undefined : catalogName(input.name);
  if (!id && !named) throw new AppError("validation");
  if (input.required !== undefined && typeof input.required !== "boolean") throw new AppError("validation");
  const now = ctx.ports.clock.now();
  const access = await personnelAccess(ctx.store, scope);
  await documentTypesOf(ctx, access.businessId);
  return ctx.store.transaction(
    async (repos) => {
      const list = await repos.personnel.documentTypes.listByBusiness(access.businessId);
      if (named && list.some((d) => d.id !== id && !d.archivedAt && d.nameKey === named.nameKey)) throw new AppError("duplicate_name");
      if (!id) {
        const d = await repos.personnel.documentTypes.insert({ businessId: access.businessId, name: named!.name, nameKey: named!.nameKey, required: (input.required as boolean | undefined) ?? true, validityMonths: validity(input.validityMonths), position: list.length, createdAt: now });
        await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "document_type.created", entityType: "document_type", entityId: d.id, businessId: access.businessId, after: view(d) });
        return view(d);
      }
      const before = inBusiness(await repos.personnel.documentTypes.findById(uuidOrNotFound(id)), access);
      const after = await repos.personnel.documentTypes.update(before.id, {
        ...(named ?? {}),
        ...(input.required !== undefined ? { required: input.required as boolean } : {}),
        ...(input.validityMonths !== undefined ? { validityMonths: validity(input.validityMonths) } : {}),
        updatedAt: now,
      });
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "document_type.updated", entityType: "document_type", entityId: before.id, businessId: access.businessId, before: view(before), after: view(after) });
      return view(after);
    },
    { lock: businessLock(scope.active.business.id) },
  );
}

export async function setDocumentTypeArchived(ctx: Ctx, scope: CatalogScope, id: string, archived: boolean): Promise<DocumentTypeView> {
  ownerOnly(scope);
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(
    async (repos) => {
      const access = await personnelAccess(repos, scope);
      const before = inBusiness(await repos.personnel.documentTypes.findById(uuidOrNotFound(id)), access);
      if (!archived && (await repos.personnel.documentTypes.listByBusiness(access.businessId)).some((d) => d.id !== id && !d.archivedAt && d.nameKey === before.nameKey)) throw new AppError("duplicate_name");
      const after = await repos.personnel.documentTypes.update(id, { archivedAt: archived ? now : null, updatedAt: now });
      await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: archived ? "document_type.archived" : "document_type.reactivated", entityType: "document_type", entityId: id, businessId: access.businessId });
      return view(after);
    },
    { lock: businessLock(scope.active.business.id) },
  );
}

/** RF-17: el orden de la lista. */
export async function reorderDocumentTypes(ctx: Ctx, scope: CatalogScope, ids: unknown): Promise<DocumentTypeView[]> {
  ownerOnly(scope);
  if (!Array.isArray(ids)) throw new AppError("validation");
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(
    async (repos) => {
      const access = await personnelAccess(repos, scope);
      const list = await repos.personnel.documentTypes.listByBusiness(access.businessId);
      if (ids.length !== list.length || !list.every((d) => ids.includes(d.id))) throw new AppError("validation");
      for (const [position, id] of (ids as string[]).entries()) await repos.personnel.documentTypes.update(id, { position, updatedAt: now });
      return (await repos.personnel.documentTypes.listByBusiness(access.businessId)).map(view);
    },
    { lock: businessLock(scope.active.business.id) },
  );
}
