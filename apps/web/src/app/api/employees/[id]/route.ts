// Spec 008 RF-6, RF-15, RF-42: un expediente y editar sus datos.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { employeeDetail, updateEmployee } from "@/server/services/personnel/employees";

type Params = { params: Promise<{ id: string }> };

export const GET = handler(async (request: Request, { params }: Params) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ employee: await employeeDetail(appCtx(), scope, (await params).id) });
});

const body = z.object({ name: z.string().optional(), positionId: z.string().optional(), hiredOn: z.string().optional(), phone: z.string().nullish(), notes: z.string().nullish() });

export const PATCH = handler(async (request: Request, { params }: Params) => {
  const scope = await requireCatalogScope(request);
  const ctx = appCtx();
  const { id } = await params;
  await updateEmployee(ctx, scope, id, await readJson(request, body));
  return Response.json({ employee: await employeeDetail(ctx, scope, id) });
});
