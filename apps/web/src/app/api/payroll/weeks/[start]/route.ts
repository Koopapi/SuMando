// Spec 009 RF-1 a RF-5, RF-9 a RF-12, RF-17, RF-25: la semana según el rol.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler } from "@/server/http";
import { payrollWeek } from "@/server/services/payroll/weeks";

export const GET = handler(async (request: Request, { params }: { params: Promise<{ start: string }> }) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ week: await payrollWeek(appCtx(), scope, (await params).start) });
});
