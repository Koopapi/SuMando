// Spec 011 RF-4, RF-6 a RF-10: configuración del corte de la sucursal activa (cambiarla, solo el dueño).
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler, readJson } from "@/server/http";
import { cashSettingsView, saveCashSettings } from "@/server/services/cash/settings";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ settings: await cashSettingsView(appCtx(), scope) });
});

const body = z.object({ mode: z.string(), floorEnabled: z.boolean(), methods: z.array(z.object({ id: z.string().nullish(), name: z.string() })).max(40) });

export const PUT = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ settings: await saveCashSettings(appCtx(), scope, await readJson(request, body)) });
});
