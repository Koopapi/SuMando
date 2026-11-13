// Spec 007 RF-1 a RF-23, RF-42, RF-43: requisiciones de la sucursal activa y crear una.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { createRequisition, listRequisitions } from "@/server/services/requisitions/requisitions";
import { REQUISITION_BODY_BYTES, reqLine } from "./schema";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ requisitions: await listRequisitions(appCtx(), scope, new URL(request.url).searchParams.get("estado")) });
});

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, z.object({ warehouseId: z.string(), lines: z.array(reqLine), note: z.string().nullish() }), REQUISITION_BODY_BYTES);
  const r = await createRequisition(appCtx(), scope, input);
  return Response.json({ requisition: { id: r.id, folio: r.folio, status: r.status } }, { status: 201 });
});
