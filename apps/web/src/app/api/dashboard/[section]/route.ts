// Spec 012 RF-5, RF-8, RF-21 a RF-50: detalle de una sección; el administrador solo alertas y ventas.
import { appCtx } from "@/server/app-context";
import { requireSession } from "@/server/auth/session";
import { handler } from "@/server/http";
import { dashboardSection } from "@/server/services/reports/dashboard";
import { periodQuery } from "../query";

export const GET = handler(async (request: Request, { params }: { params: Promise<{ section: string }> }) => {
  const session = await requireSession(request);
  return Response.json({ detail: await dashboardSection(appCtx(), session.user, (await params).section, periodQuery(request)) });
});
