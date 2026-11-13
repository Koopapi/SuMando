// Spec 008 RF-13, RF-28 a RF-35: sueldo (solo el dueño), baja, reingreso y cambio de sucursal.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { AppError } from "@/server/errors";
import { handler, readJson } from "@/server/http";
import { employeeDetail, moveEmployee, rehireEmployee, setEmployeePay, terminateEmployee } from "@/server/services/personnel/employees";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string; action: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { id, action } = await params;
  const ctx = appCtx();
  if (action === "pay") await setEmployeePay(ctx, scope, id, (await readJson(request, z.object({ dailyPay: z.string() }))).dailyPay);
  else if (action === "terminate") await terminateEmployee(ctx, scope, id, await readJson(request, z.object({ leftOn: z.string(), reason: z.string(), note: z.string().nullish() })));
  else if (action === "rehire") await rehireEmployee(ctx, scope, id, await readJson(request, z.object({ hiredOn: z.string() })));
  else if (action === "move") {
    await moveEmployee(ctx, scope, id, await readJson(request, z.object({ branchId: z.string(), on: z.string().nullish() })));
    return Response.json({ moved: true });
  } else throw new AppError("not_found");
  return Response.json({ employee: await employeeDetail(ctx, scope, id) });
});
