// Spec 010 RF-15, RF-19, RF-47: la hoja de una plantilla en una fecha (el teléfono, solo hoy).
import { appCtx } from "@/server/app-context";
import { requireChecklistActor } from "@/server/auth/checklist-actor";
import { handler } from "@/server/http";
import { sheetView } from "@/server/services/checklists/sheets";

export const GET = handler(async (request: Request, { params }: { params: Promise<{ templateId: string; date: string }> }) => {
  const actor = await requireChecklistActor(request, new URL(request.url).searchParams.get("employee"));
  const { templateId, date } = await params;
  return Response.json({ sheet: await sheetView(appCtx(), actor, templateId, date) });
});
