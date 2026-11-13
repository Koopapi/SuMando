// Spec 008 RF-1 a RF-13, RF-36: empleados de la sucursal activa y dar de alta uno.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { createEmployee, listEmployees } from "@/server/services/personnel/employees";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ employees: await listEmployees(appCtx(), scope) });
});

const body = z.object({
  name: z.string(),
  positionId: z.string(),
  hiredOn: z.string(),
  phone: z.string().nullish(),
  notes: z.string().nullish(),
  dailyPay: z.string().nullish(),
  confirmDuplicate: z.boolean().optional(),
});

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const e = await createEmployee(appCtx(), scope, await readJson(request, body));
  return Response.json({ employee: { id: e.id, name: e.name } }, { status: 201 });
});
