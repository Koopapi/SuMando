// Spec 003 RF-4, RF-9, RF-10: productos del negocio activo.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { createProduct } from "@/server/services/catalog/products";
import { catalogView } from "@/server/services/catalog/views";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ products: (await catalogView(appCtx(), scope)).products });
});

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, z.object({ name: z.string(), baseUnit: z.unknown(), supplierId: z.string().nullable().optional(), notes: z.string().nullable().optional() }));
  const product = await createProduct(appCtx(), scope, input);
  return Response.json({ product: { id: product.id, name: product.name, baseUnit: product.baseUnit, supplierId: product.supplierId } }, { status: 201 });
});
