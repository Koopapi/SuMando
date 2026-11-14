// Spec 011: el corte abierto de la sucursal (persona o teléfono de piso, `?employee=`); ciego para el teléfono.
import { appCtx } from "@/server/app-context";
import { requireChecklistActor } from "@/server/auth/checklist-actor";
import { handler } from "@/server/http";
import { currentCut } from "@/server/services/cash/cuts";

export const GET = handler(async (request: Request) => {
  const actor = await requireChecklistActor(request, new URL(request.url).searchParams.get("employee"));
  return Response.json({ cut: await currentCut(appCtx(), actor) });
});
