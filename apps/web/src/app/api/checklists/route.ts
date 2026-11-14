// Spec 010 RF-16, RF-38: los checklists de hoy de la sucursal (persona o teléfono de piso, `?employee=`).
import { appCtx } from "@/server/app-context";
import { requireChecklistActor } from "@/server/auth/checklist-actor";
import { handler } from "@/server/http";
import { todayChecklists } from "@/server/services/checklists/sheets";

export const GET = handler(async (request: Request) => {
  const actor = await requireChecklistActor(request, new URL(request.url).searchParams.get("employee"));
  return Response.json({ checklists: await todayChecklists(appCtx(), actor) });
});
