// Spec 008 RF-10, RF-11: puestos del negocio.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { createPosition, listPositions } from "@/server/services/personnel/positions";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ positions: await listPositions(appCtx(), scope) });
});

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const { name } = await readJson(request, z.object({ name: z.string() }));
  return Response.json({ position: await createPosition(appCtx(), scope, name) }, { status: 201 });
});
