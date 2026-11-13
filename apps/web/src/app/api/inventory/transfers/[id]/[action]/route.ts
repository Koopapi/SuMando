// Spec 005 RF-29 a RF-37, RF-64: recibir un traspaso o cancelarlo.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { AppError } from "@/server/errors";
import { handler, readJson } from "@/server/http";
import { cancelTransfer, receiveTransfer, transferDetail } from "@/server/services/inventory/transfers";
import { INVENTORY_BODY_BYTES } from "../../../schema";

const receiveBody = z.object({ lines: z.array(z.object({ lineId: z.string(), productId: z.string().nullish(), presentationId: z.string().nullish(), quantity: z.string() })) });

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string; action: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { id, action } = await params;
  const ctx = appCtx();
  if (action === "receive") {
    const { lines } = await readJson(request, receiveBody, INVENTORY_BODY_BYTES);
    await receiveTransfer(ctx, scope, id, lines);
  } else if (action === "cancel") {
    const { reason } = await readJson(request, z.object({ reason: z.string() }));
    await cancelTransfer(ctx, scope, id, reason);
  } else throw new AppError("not_found");
  return Response.json({ transfer: await transferDetail(ctx, scope, id) });
});
