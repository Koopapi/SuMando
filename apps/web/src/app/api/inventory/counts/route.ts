// Spec 005 RF-43, RF-49 a RF-53: aplicar el conteo de un área; si algo cambió mientras se contaba, 409 count_changed.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { applyCount } from "@/server/services/inventory/counts";
import { INVENTORY_BODY_BYTES } from "../schema";

const body = z.object({
  areaId: z.string(),
  lines: z.array(z.object({ productId: z.string(), presentationId: z.string().nullish(), quantity: z.string(), seen: z.string() })),
  confirm: z.boolean().optional(),
});

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, body, INVENTORY_BODY_BYTES);
  const c = await applyCount(appCtx(), scope, input);
  return Response.json({ count: { id: c.id, createdAt: c.createdAt.toISOString() } }, { status: 201 });
});
