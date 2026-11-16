// Spec 011 RF-11 a RF-14, RF-40: abrir un corte (persona o teléfono) e historial (solo personas).
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { requireChecklistActor } from "@/server/auth/checklist-actor";
import { handler, readJson } from "@/server/http";
import { cutHistory, openCut } from "@/server/services/cash/cuts";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ cuts: await cutHistory(appCtx(), { kind: "user", scope }) });
});

export const POST = handler(async (request: Request) => {
  const input = await readJson(request, z.object({ fund: z.string(), employeeId: z.string().nullish() }));
  const actor = await requireChecklistActor(request, input.employeeId);
  return Response.json({ cut: await openCut(appCtx(), actor, input.fund) }, { status: 201 });
});
