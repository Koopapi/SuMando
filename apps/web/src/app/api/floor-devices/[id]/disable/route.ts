// Spec 010 RF-44: deshabilitar un teléfono de piso de la sucursal activa.
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { handler } from "@/server/http";
import { disableFloorDevice, listFloorDevices } from "@/server/services/checklists/floor";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const scope = await requireCatalogScope(request);
  await disableFloorDevice(appCtx(), scope, (await params).id);
  return Response.json({ devices: await listFloorDevices(appCtx(), scope) });
});
