// Spec 006 RF-5, RF-8, RF-16, RF-23: revisar (sin guardar) o confirmar la importación de una hoja «Inventario por
// áreas». Formulario con `file`, `warehouseId` y `confirm=1` para guardar.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { AppError } from "@/server/errors";
import { handler } from "@/server/http";
import { confirmInventoryImport, IMPORT_MAX_BYTES, reviewInventoryImport } from "@/server/services/inventory/import";

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  if (Number(request.headers.get("content-length") ?? 0) > IMPORT_MAX_BYTES + 64 * 1024) throw new AppError("file_too_large");
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new AppError("invalid_file");
  }
  const file = form.get("file");
  if (!(file instanceof Blob)) throw new AppError("invalid_file");
  if (file.size > IMPORT_MAX_BYTES) throw new AppError("file_too_large");
  const buffer = Buffer.from(await file.arrayBuffer());
  const warehouseId = form.get("warehouseId");
  const name = file instanceof File ? file.name : "";
  if (form.get("confirm") === "1") return Response.json(await confirmInventoryImport(appCtx(), scope, warehouseId, buffer, name));
  return Response.json(await reviewInventoryImport(appCtx(), scope, warehouseId, buffer));
});
