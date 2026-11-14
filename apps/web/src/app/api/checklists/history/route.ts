// Spec 010 RF-46: hojas de la sucursal activa (solo personas).
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler } from "@/server/http";
import { sheetHistory } from "@/server/services/checklists/sheets";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ sheets: await sheetHistory(appCtx(), { kind: "user", scope }) });
});
