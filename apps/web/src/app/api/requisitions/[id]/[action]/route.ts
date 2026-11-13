// Spec 007 RF-25 a RF-28, RF-34 a RF-40: aprobar, rechazar, cancelar, recibir y cerrar lo pendiente.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { AppError } from "@/server/errors";
import { handler, readJson } from "@/server/http";
import { approveRequisition, cancelRequisition, closeLines, receiveRequisition, rejectRequisition, requisitionDetail } from "@/server/services/requisitions/requisitions";
import { REQUISITION_BODY_BYTES, reqLine } from "../../schema";

const reason = z.object({ reason: z.string() });

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string; action: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { id, action } = await params;
  const ctx = appCtx();
  if (action === "approve") await approveRequisition(ctx, scope, id, await readJson(request, z.object({ lines: z.array(reqLine).optional(), note: z.string().nullish() }), REQUISITION_BODY_BYTES));
  else if (action === "reject") await rejectRequisition(ctx, scope, id, (await readJson(request, reason)).reason);
  else if (action === "cancel") await cancelRequisition(ctx, scope, id, (await readJson(request, reason)).reason);
  else if (action === "receive")
    await receiveRequisition(ctx, scope, id, await readJson(request, z.object({ groupId: z.string(), lines: z.array(z.object({ lineId: z.string(), quantity: z.string(), presentationId: z.string().nullish() })) }), REQUISITION_BODY_BYTES));
  else if (action === "close") await closeLines(ctx, scope, id, await readJson(request, z.object({ lineIds: z.array(z.string()), reason: z.string() }), REQUISITION_BODY_BYTES));
  else throw new AppError("not_found");
  return Response.json({ requisition: await requisitionDetail(ctx, scope, id) });
});
