// Spec 009 RF-31 a RF-40: cerrar y reabrir la semana (solo el dueño).
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { AppError } from "@/server/errors";
import { handler, readJson } from "@/server/http";
import { closeWeek, reopenWeek } from "@/server/services/payroll/weeks";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ start: string; action: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { start, action } = await params;
  if (action === "close") return Response.json({ week: await closeWeek(appCtx(), scope, start) });
  if (action === "reopen") return Response.json({ week: await reopenWeek(appCtx(), scope, start, (await readJson(request, z.object({ reason: z.string() }))).reason) });
  throw new AppError("not_found");
});
