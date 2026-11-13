// Spec 004 RF-40 a RF-48: revisar un .xlsx (sin guardar) o confirmar su importación. Se envía como formulario con
// el campo `file`; `confirm=1` guarda los platillos listos.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { MAX_FILE_BYTES } from "@/server/adapters/xlsx";
import { AppError } from "@/server/errors";
import { handler } from "@/server/http";
import { confirmImport, reviewImport } from "@/server/services/recipes/import";

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  // El formulario pesa un poco más que el archivo; lo que pasa de sobra ni se lee.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_FILE_BYTES + 64 * 1024) throw new AppError("file_too_large");
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new AppError("invalid_file");
  }
  const file = form.get("file");
  if (!(file instanceof Blob)) throw new AppError("invalid_file");
  if (file.size > MAX_FILE_BYTES) throw new AppError("file_too_large");
  const buffer = Buffer.from(await file.arrayBuffer());
  if (form.get("confirm") === "1") return Response.json(await confirmImport(appCtx(), scope, buffer));
  return Response.json(await reviewImport(appCtx(), scope, buffer));
});
