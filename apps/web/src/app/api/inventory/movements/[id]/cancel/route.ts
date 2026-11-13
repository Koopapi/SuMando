// Spec 005 RF-64, RF-65: cancelar con el movimiento inverso y un motivo.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { cancelMovement } from "@/server/services/inventory/movements";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { reason } = await readJson(request, z.object({ reason: z.string() }));
  const m = await cancelMovement(appCtx(), scope, (await params).id, reason);
  return Response.json({ movement: { id: m.id, kind: m.kind, createdAt: m.createdAt.toISOString() } }, { status: 201 });
});
