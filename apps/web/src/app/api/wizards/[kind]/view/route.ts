// Spec 015 RF-26: recordar si la persona prefiere el asistente o la vista completa en esta tarea.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireSession } from "@/server/auth/session";
import { handler, readJson } from "@/server/http";
import { setWizardView } from "@/server/services/wizards/preferences";

export const PUT = handler(async (request: Request, { params }: { params: Promise<{ kind: string }> }) => {
  const { user } = await requireSession(request);
  const { view } = await readJson(request, z.object({ view: z.string() }));
  return Response.json({ view: await setWizardView(appCtx(), user, (await params).kind, view) });
});
