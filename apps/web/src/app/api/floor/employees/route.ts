// Spec 010 RF-40: empleados activos de la sucursal del teléfono de piso, para elegir el nombre.
import { appCtx } from "@/server/app-context";
import { requireFloorDevice } from "@/server/auth/checklist-actor";
import { handler } from "@/server/http";
import { floorEmployees } from "@/server/services/checklists/floor";

export const GET = handler(async (request: Request) => {
  const { device } = await requireFloorDevice(request);
  return Response.json({ device: { name: device.name }, employees: await floorEmployees(appCtx(), device.branchId, device.businessId) });
});
