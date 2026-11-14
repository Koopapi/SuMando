// Spec 011 RF-41: el detalle de un corte (solo personas).
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler } from "@/server/http";
import { cutDetail } from "@/server/services/cash/cuts";

export const GET = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ cut: await cutDetail(appCtx(), { kind: "user", scope }, (await params).id) });
});
