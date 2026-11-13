// Spec 007 RF-27, RF-29 a RF-32: comprador, comprado e importes de un grupo de proveedor.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { requisitionDetail, updateGroup } from "@/server/services/requisitions/requisitions";
import { REQUISITION_BODY_BYTES } from "../../../schema";

const body = z.object({
  buyer: z.string().nullish(),
  purchased: z.boolean().optional(),
  total: z.string().nullish(),
  amounts: z.array(z.object({ lineId: z.string(), amount: z.string().nullable() })).optional(),
});

export const PATCH = handler(async (request: Request, { params }: { params: Promise<{ id: string; groupId: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { id, groupId } = await params;
  const input = await readJson(request, body, REQUISITION_BODY_BYTES);
  const ctx = appCtx();
  await updateGroup(ctx, scope, id, groupId, input);
  return Response.json({ requisition: await requisitionDetail(ctx, scope, id) });
});
