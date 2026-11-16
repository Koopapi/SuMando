// Spec 009 RF-6, RF-20, RF-21: extras, bonos con concepto y comida (solo el dueño).
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { setAmounts } from "@/server/services/payroll/weeks";

const body = z.object({ extras: z.string().optional(), bonus: z.string().optional(), bonusConcept: z.string().nullish(), meal: z.string().optional() });

export const PATCH = handler(async (request: Request, { params }: { params: Promise<{ start: string; employeeId: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { start, employeeId } = await params;
  return Response.json({ week: await setAmounts(appCtx(), scope, start, employeeId, await readJson(request, body)) });
});
