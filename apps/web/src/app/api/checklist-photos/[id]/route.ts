// Spec 010 RF-48: la foto de un punto, sin guardarse en cachés.
import { appCtx } from "@/server/app-context";
import { requireChecklistActor } from "@/server/auth/checklist-actor";
import { handler } from "@/server/http";
import { checklistPhoto } from "@/server/services/checklists/sheets";

export const GET = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const actor = await requireChecklistActor(request);
  const photo = await checklistPhoto(appCtx(), actor, (await params).id);
  return new Response(new Uint8Array(photo.bytes), { headers: { "content-type": photo.contentType, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
});
