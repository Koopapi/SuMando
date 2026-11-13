// Reglas comunes de personal (spec 008): todo en el negocio y la sucursal activa, con el rol comprobado en el
// servidor; el sueldo y los archivos son solo del dueño (RF-4, RF-5, RF-7).
import type { DocumentType, Employee } from "@/db/schema";
import { isOwner } from "@/domain/access/owner";
import { catalogKey } from "@/domain/catalog/names";
import { DEFAULT_DOCUMENTS } from "@/domain/personnel/defaults";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { businessLock, catalogAccess, type CatalogAccess, type CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { uuidOrNotFound } from "../inventory/shared";

export const personnelAccess = (repos: Repos, scope: CatalogScope): Promise<CatalogAccess> => catalogAccess(repos, scope);

export function ownerOnly(scope: CatalogScope) {
  if (!isOwner(scope.actor)) throw new AppError("owner_only");
}

/** Un empleado de la sucursal activa; de otra sucursal o negocio, no existe (RF-6). */
export async function ownEmployee(repos: Repos, scope: CatalogScope, id: unknown): Promise<Employee> {
  const e = await repos.personnel.employees.findById(uuidOrNotFound(id));
  if (!e || e.businessId !== scope.active.business.id || e.branchId !== scope.active.branch.id) throw new AppError("not_found");
  return e;
}

/** RF-16: la primera vez que el negocio usa Personal, su lista de documentos empieza con los 13 de la hoja. */
export async function documentTypesOf(ctx: Ctx, businessId: string): Promise<DocumentType[]> {
  const list = await ctx.store.personnel.documentTypes.listByBusiness(businessId);
  if (list.length) return list;
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(
    async (repos) => {
      const again = await repos.personnel.documentTypes.listByBusiness(businessId);
      if (again.length) return again;
      const out: DocumentType[] = [];
      for (const [position, d] of DEFAULT_DOCUMENTS.entries()) {
        out.push(await repos.personnel.documentTypes.insert({ businessId, name: d.name, nameKey: catalogKey(d.name), required: true, validityMonths: d.validityMonths, position, createdAt: now }));
      }
      return out;
    },
    { lock: businessLock(businessId) },
  );
}
