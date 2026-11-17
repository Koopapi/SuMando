// Spec 013 RF-1 y RF-2: asignar o quitar el comprador habitual de un proveedor en la sucursal activa.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { setSupplierBuyer } from "@/server/services/catalog/supplier-buyers";

export const PUT = handler(async (request: Request, { params }: { params: Promise<{ supplierId: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { employeeId } = await readJson(request, z.object({ employeeId: z.string().nullable() }));
  return Response.json(await setSupplierBuyer(appCtx(), scope, (await params).supplierId, employeeId));
});
