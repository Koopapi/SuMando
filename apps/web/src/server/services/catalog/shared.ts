// Reglas comunes del catálogo (spec 003): todo ocurre dentro del negocio de la sucursal activa (RF-4), con el
// permiso comprobado en el servidor (RF-6 a RF-8) y cada cambio en el registro (RF-38).
import type { Branch, Membership } from "@/db/schema";
import { isOwner } from "@/domain/access/owner";
import { canManageBranchCatalog, canManageBusinessCatalog } from "@/domain/catalog/access";
import { CATALOG_NAME_MAX, catalogKey, catalogNameProblem } from "@/domain/catalog/names";
import { normalizeName } from "@/domain/text";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import type { ActiveBranch } from "../active-branch";
import type { PublicUser } from "../users-public";
import { isUniqueViolation } from "../validation";

/** Quién actúa y desde qué sucursal activa: de ahí sale el negocio (RF-4). */
export interface CatalogScope {
  actor: PublicUser;
  active: ActiveBranch;
}

export interface CatalogAccess {
  businessId: string;
  memberships: Membership[];
  branches: Branch[];
}

export async function catalogAccess(repos: Repos, scope: CatalogScope): Promise<CatalogAccess> {
  const businessId = scope.active.business.id;
  const [memberships, branches] = await Promise.all([isOwner(scope.actor) ? Promise.resolve([]) : repos.memberships.listByUser(scope.actor.id), repos.branches.listByBusiness(businessId)]);
  if (!canManageBusinessCatalog(scope.actor, memberships, branches, businessId)) throw new AppError("forbidden");
  return { businessId, memberships, branches };
}

/** Un elemento de otro negocio no existe para quien pregunta (RF-8). */
export function inBusiness<T extends { businessId: string }>(item: T | null, access: CatalogAccess): T {
  if (!item || item.businessId !== access.businessId) throw new AppError("not_found");
  return item;
}

/** Almacenes y áreas de una sucursal: solo con esa sucursal (RF-7). */
export function assertBranch(scope: CatalogScope, access: CatalogAccess, branchId: string | null) {
  if (branchId === null) return;
  const branch = access.branches.find((b) => b.id === branchId);
  if (!branch || !canManageBranchCatalog(scope.actor, access.memberships, branch)) throw new AppError("forbidden");
}

export function catalogName(raw: string): { name: string; nameKey: string } {
  if (catalogNameProblem(raw)) throw new AppError("catalog_name_invalid", { max: CATALOG_NAME_MAX });
  return { name: normalizeName(raw), nameKey: catalogKey(raw) };
}

/** Texto opcional: sin espacios exteriores, vacío = nulo, con su límite. */
export function optionalText(raw: string | null | undefined, max: number): string | null {
  const text = (raw ?? "").trim();
  if (text.length > max) throw new AppError("validation");
  return text || null;
}

export async function withDuplicateGuard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("duplicate_name");
    throw e;
  }
}

/** Número del cerrojo de aviso de un negocio, para altas cuya unicidad no cubre un índice (RF-20). */
export function businessLock(businessId: string): number {
  let h = 0;
  for (const c of businessId) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  return h;
}
