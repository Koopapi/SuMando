// Spec 009 RF-30: el abono de un préstamo en esta semana (solo el dueño).
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { setLoanPayment } from "@/server/services/payroll/weeks";

export const PUT = handler(async (request: Request, { params }: { params: Promise<{ start: string; loanId: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { start, loanId } = await params;
  const { amount } = await readJson(request, z.object({ amount: z.string() }));
  return Response.json({ week: await setLoanPayment(appCtx(), scope, start, loanId, amount) });
});
