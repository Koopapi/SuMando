// Spec 003 RF-33, RF-34, RF-37: archivar o reactivar productos, proveedores, almacenes y áreas. No hay borrado.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { AppError } from "@/server/errors";
import { handler } from "@/server/http";
import { isCatalogKind, setArchived } from "@/server/services/catalog/archive";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ kind: string; id: string; action: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { kind, id, action } = await params;
  if (!isCatalogKind(kind) || (action !== "archive" && action !== "reactivate")) throw new AppError("not_found");
  const item = await setArchived(appCtx(), scope, kind, id, action === "archive");
  return Response.json({ item: { id: item.id, name: item.name, archived: item.archivedAt !== null } });
});
