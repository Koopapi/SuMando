// Spec 009 RF-45: la semana en Excel (solo el dueño), sin guardarse en cachés.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler } from "@/server/http";
import { payrollWeekExcel } from "@/server/services/payroll/export";

export const GET = handler(async (request: Request, { params }: { params: Promise<{ start: string }> }) => {
  const scope = await requireCatalogScope(request);
  const file = await payrollWeekExcel(appCtx(), scope, (await params).start);
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${file.fileName}"`,
      "cache-control": "private, no-store",
    },
  });
});
