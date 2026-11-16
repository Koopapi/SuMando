// Spec 009 RF-4, RF-10, RF-13 a RF-16: marcar un día de un empleado.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { markDay } from "@/server/services/payroll/weeks";

const body = z.object({ employeeId: z.string(), day: z.number().int(), state: z.enum(["empty", "worked", "half"]), late: z.boolean().optional() });

export const PUT = handler(async (request: Request, { params }: { params: Promise<{ start: string }> }) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ week: await markDay(appCtx(), scope, (await params).start, await readJson(request, body)) });
});
