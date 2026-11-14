// Spec 009 RF-46: semanas de nómina de la sucursal activa (el total solo para el dueño).
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler } from "@/server/http";
import { listPayrollWeeks } from "@/server/services/payroll/weeks";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ weeks: await listPayrollWeeks(appCtx(), scope) });
});
