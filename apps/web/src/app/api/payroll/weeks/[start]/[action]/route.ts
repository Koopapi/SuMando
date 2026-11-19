// Spec 009 RF-31 a RF-40: cerrar y reabrir la semana (solo el dueño).
// Spec 015 RF-39: `preview` calcula cómo quedaría al cerrar con lo capturado en el asistente, sin guardar.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { AppError } from "@/server/errors";
import { handler, readJson } from "@/server/http";
import { closeWeek, previewClose, reopenWeek } from "@/server/services/payroll/weeks";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ start: string; action: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { start, action } = await params;
  if (action === "close") return Response.json({ week: await closeWeek(appCtx(), scope, start) });
  if (action === "reopen") return Response.json({ week: await reopenWeek(appCtx(), scope, start, (await readJson(request, z.object({ reason: z.string() }))).reason) });
  if (action === "preview") {
    const body = await readJson(request, z.object({ lines: z.record(z.string(), z.object({ extras: z.string().optional(), bonus: z.string().optional(), bonusConcept: z.string().optional(), meal: z.string().optional() })).optional(), loans: z.record(z.string(), z.string()).optional() }));
    return Response.json({ preview: await previewClose(appCtx(), scope, start, body) });
  }
  throw new AppError("not_found");
});
