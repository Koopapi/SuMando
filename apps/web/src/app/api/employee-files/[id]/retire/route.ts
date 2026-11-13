// Spec 008 RF-25: el dueño retira un archivo con motivo.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { retireDocumentFile } from "@/server/services/personnel/files";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  const { reason } = await readJson(request, z.object({ reason: z.string() }));
  const f = await retireDocumentFile(appCtx(), scope, (await params).id, reason);
  return Response.json({ file: { id: f.id, retired: true } });
});
