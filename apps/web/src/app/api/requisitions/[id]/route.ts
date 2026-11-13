// Spec 007 RF-6, RF-24, RF-44: una requisición con su historial, y editarla mientras está solicitada.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { requisitionDetail, updateRequisition } from "@/server/services/requisitions/requisitions";
import { REQUISITION_BODY_BYTES, reqLine } from "../schema";

type Params = { params: Promise<{ id: string }> };

export const GET = handler(async (request: Request, { params }: Params) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ requisition: await requisitionDetail(appCtx(), scope, (await params).id) });
});

export const PUT = handler(async (request: Request, { params }: Params) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, z.object({ lines: z.array(reqLine), note: z.string().nullish() }), REQUISITION_BODY_BYTES);
  const ctx = appCtx();
  const { id } = await params;
  await updateRequisition(ctx, scope, id, input);
  return Response.json({ requisition: await requisitionDetail(ctx, scope, id) });
});
