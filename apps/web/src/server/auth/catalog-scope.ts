// Alcance del catálogo para los handlers (spec 003, RF-4): la persona con sesión y su sucursal activa.
import type { CatalogScope } from "../services/catalog/shared";
import { requireBranch } from "./session";

export async function requireCatalogScope(request: Request): Promise<CatalogScope> {
  const { user, active } = await requireBranch(request);
  return { actor: user, active };
}
