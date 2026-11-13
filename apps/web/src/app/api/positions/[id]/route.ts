// Spec 008 RF-11: renombrar un puesto.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { renamePosition } from "@/server/services/personnel/positions";

export const PATCH = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { name } = await readJson(request, z.object({ name: z.string() }));
  return Response.json({ position: await renamePosition(appCtx(), scope, (await params).id, name) });
});
