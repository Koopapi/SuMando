// Spec 003 RF-27, RF-30: cambiar un proveedor.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { updateSupplier } from "@/server/services/catalog/suppliers";

export const PATCH = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, z.object({ name: z.string().optional(), phone: z.string().nullable().optional(), notes: z.string().nullable().optional() }));
  const s = await updateSupplier(appCtx(), scope, (await params).id, input);
  return Response.json({ supplier: { id: s.id, name: s.name, phone: s.phone, notes: s.notes } });
});
