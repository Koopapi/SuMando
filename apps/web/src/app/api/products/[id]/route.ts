// Spec 003 RF-9, RF-15, RF-16, RF-28, RF-35: cambiar un producto (la unidad base no cambia).
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { updateProduct } from "@/server/services/catalog/products";

const nullableId = z.string().nullable().optional();

export const PATCH = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(
    request,
    z.object({ name: z.string().optional(), baseUnit: z.unknown().optional(), supplierId: nullableId, notes: z.string().nullable().optional(), purchasePresentationId: nullableId, countPresentationId: nullableId }),
  );
  const p = await updateProduct(appCtx(), scope, (await params).id, input);
  return Response.json({ product: { id: p.id, name: p.name, baseUnit: p.baseUnit, supplierId: p.supplierId, notes: p.notes, purchasePresentationId: p.purchasePresentationId, countPresentationId: p.countPresentationId } });
});
