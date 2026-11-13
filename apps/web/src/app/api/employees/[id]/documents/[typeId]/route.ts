// Spec 008 RF-18 a RF-20, RF-24: subir uno o varios archivos a un documento del expediente (`file`, `issuedOn`,
// `replace=1`). Cada archivo hasta 10 MB; el tipo se decide por su contenido.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { AppError } from "@/server/errors";
import { handler } from "@/server/http";
import { employeeDetail } from "@/server/services/personnel/employees";
import { uploadDocument } from "@/server/services/personnel/files";
import { FILE_MAX_BYTES } from "@/domain/personnel/files";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string; typeId: string }> }) => {
  const scope = await requireCatalogScope(request);
  if (Number(request.headers.get("content-length") ?? 0) > 10 * FILE_MAX_BYTES + 256 * 1024) throw new AppError("file_size");
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new AppError("file_type");
  }
  const blobs = form.getAll("file").filter((f): f is File => f instanceof File);
  if (blobs.some((f) => f.size > FILE_MAX_BYTES)) throw new AppError("file_size");
  const files = await Promise.all(blobs.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })));
  const { id, typeId } = await params;
  const ctx = appCtx();
  const issuedOn = form.get("issuedOn");
  await uploadDocument(ctx, scope, id, typeId, { files, issuedOn: typeof issuedOn === "string" ? issuedOn : undefined, replace: form.get("replace") === "1" });
  return Response.json({ employee: await employeeDetail(ctx, scope, id) }, { status: 201 });
});
