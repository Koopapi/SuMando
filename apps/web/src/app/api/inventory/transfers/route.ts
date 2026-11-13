// Spec 005 RF-22 a RF-28: traspasos de los almacenes visibles y enviar uno.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { listTransfers, sendTransfer } from "@/server/services/inventory/transfers";
import { INVENTORY_BODY_BYTES, lineBody } from "../schema";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json(await listTransfers(appCtx(), scope));
});

const body = z.object({ fromWarehouseId: z.string(), toWarehouseId: z.string(), lines: z.array(lineBody), note: z.string().nullish() });

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, body, INVENTORY_BODY_BYTES);
  const t = await sendTransfer(appCtx(), scope, input);
  return Response.json({ transfer: { id: t.id, status: t.status } }, { status: 201 });
});
