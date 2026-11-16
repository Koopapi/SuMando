// Spec 012 RF-51 a RF-54: la sección abierta en Excel, sin guardarse en cachés.
import { appCtx } from "@/server/app-context";
import { requireSession } from "@/server/auth/session";
import { handler } from "@/server/http";
import { dashboardExcel } from "@/server/services/reports/export";
import { periodQuery } from "../../query";

export const GET = handler(async (request: Request, { params }: { params: Promise<{ section: string }> }) => {
  const session = await requireSession(request);
  const file = await dashboardExcel(appCtx(), session.user, (await params).section, periodQuery(request));
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${file.fileName}"`,
      "cache-control": "private, no-store",
    },
  });
});
