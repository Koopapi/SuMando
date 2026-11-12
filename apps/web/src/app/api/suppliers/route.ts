// Spec 003 RF-1, RF-27, RF-30: proveedores del negocio activo.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { createSupplier } from "@/server/services/catalog/suppliers";
import { catalogView } from "@/server/services/catalog/views";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ suppliers: (await catalogView(appCtx(), scope)).suppliers });
});

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, z.object({ name: z.string(), phone: z.string().nullable().optional(), notes: z.string().nullable().optional() }));
  const s = await createSupplier(appCtx(), scope, input);
  return Response.json({ supplier: { id: s.id, name: s.name, phone: s.phone, notes: s.notes } }, { status: 201 });
});
