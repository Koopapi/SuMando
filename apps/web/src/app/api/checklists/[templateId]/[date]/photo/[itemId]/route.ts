// Spec 010 RF-22, RF-23: la foto de un punto (`file`, `employeeId` en el teléfono), hasta 10 MB.
import { FILE_MAX_BYTES } from "@/domain/personnel/files";
import { appCtx } from "@/server/app-context";
import { requireChecklistActor } from "@/server/auth/checklist-actor";
import { AppError } from "@/server/errors";
import { handler } from "@/server/http";
import { photoItem } from "@/server/services/checklists/sheets";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ templateId: string; date: string; itemId: string }> }) => {
  if (Number(request.headers.get("content-length") ?? 0) > FILE_MAX_BYTES + 256 * 1024) throw new AppError("file_size");
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new AppError("file_type");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError("file_type");
  if (file.size > FILE_MAX_BYTES) throw new AppError("file_size");
  const actor = await requireChecklistActor(request, form.get("employeeId"));
  const { templateId, date, itemId } = await params;
  return Response.json({ sheet: await photoItem(appCtx(), actor, templateId, date, itemId, new Uint8Array(await file.arrayBuffer())) }, { status: 201 });
});
