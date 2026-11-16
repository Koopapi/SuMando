// Spec 012 RF-1 a RF-7, RF-11 a RF-20: resumen del tablero con las secciones que le tocan a quien consulta.
import { appCtx } from "@/server/app-context";
import { requireSession } from "@/server/auth/session";
import { handler } from "@/server/http";
import { dashboardSummary } from "@/server/services/reports/dashboard";
import { periodQuery } from "./query";

export const GET = handler(async (request: Request) => {
  const session = await requireSession(request);
  return Response.json({ dashboard: await dashboardSummary(appCtx(), session.user, periodQuery(request)) });
});
