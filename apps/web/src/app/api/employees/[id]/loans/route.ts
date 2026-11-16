// Spec 009 RF-27, RF-28, RF-34: préstamos de un empleado (solo el dueño).
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { createLoan, employeeLoans } from "@/server/services/payroll/loans";

export const GET = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ loans: await employeeLoans(appCtx(), scope, (await params).id) });
});

const body = z.object({ lentOn: z.string(), amount: z.string(), weekly: z.string() });

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ loans: await createLoan(appCtx(), scope, (await params).id, await readJson(request, body)) }, { status: 201 });
});
