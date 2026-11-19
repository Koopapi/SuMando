// Spec 015 RF-17 a RF-22: lo capturado a medias en un asistente (`?target=` para lo que trabaja sobre algo que ya
// existe; `?employee=` en el teléfono de piso).
import { z } from "zod";
import { DRAFT_MAX_BYTES } from "@/domain/wizards/drafts";
import { appCtx } from "@/server/app-context";
import { requireChecklistActor } from "@/server/auth/checklist-actor";
import { handler, readJson } from "@/server/http";
import { discardDraft, getDraft, saveDraft } from "@/server/services/wizards/drafts";

type Params = { params: Promise<{ kind: string }> };

async function context(request: Request, { params }: Params) {
  const query = new URL(request.url).searchParams;
  const actor = await requireChecklistActor(request, query.get("employee"));
  return { actor, kind: (await params).kind, target: query.get("target") ?? "" };
}

export const GET = handler(async (request: Request, p: Params) => {
  const { actor, kind, target } = await context(request, p);
  return Response.json({ draft: await getDraft(appCtx(), actor, kind, target) });
});

export const PUT = handler(async (request: Request, p: Params) => {
  const { actor, kind, target } = await context(request, p);
  // El tamaño exacto lo revisa el servicio (`draft_too_large`); aquí solo se corta lo que es claramente demasiado.
  const input = await readJson(request, z.object({ step: z.string(), data: z.unknown() }), 2 * DRAFT_MAX_BYTES);
  return Response.json({ draft: await saveDraft(appCtx(), actor, kind, target, input) });
});

export const DELETE = handler(async (request: Request, p: Params) => {
  const { actor, kind, target } = await context(request, p);
  await discardDraft(appCtx(), actor, kind, target);
  return new Response(null, { status: 204 });
});
