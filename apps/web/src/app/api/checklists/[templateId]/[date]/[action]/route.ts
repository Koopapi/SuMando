// Spec 010 RF-20 a RF-36: llenar la hoja (persona o teléfono); reabrir sección y cerrar, solo personas (RF-45).
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireChecklistActor } from "@/server/auth/checklist-actor";
import { AppError } from "@/server/errors";
import { handler, readJson } from "@/server/http";
import { allOk, checkItem, closeSheet, commentItem, reopenSection, sectionReady } from "@/server/services/checklists/sheets";

const body = z.object({ employeeId: z.string().nullish(), itemId: z.string().optional(), sectionId: z.string().optional(), done: z.boolean().optional(), text: z.string().optional() });

export const POST = handler(async (request: Request, { params }: { params: Promise<{ templateId: string; date: string; action: string }> }) => {
  const input = await readJson(request, body);
  const actor = await requireChecklistActor(request, input.employeeId);
  const { templateId, date, action } = await params;
  const ctx = appCtx();
  const run = () => {
    switch (action) {
      case "check":
        return checkItem(ctx, actor, templateId, date, input.itemId, input.done !== false);
      case "comment":
        return commentItem(ctx, actor, templateId, date, input.itemId, input.text);
      case "all-ok":
        return allOk(ctx, actor, templateId, date, input.sectionId);
      case "ready":
        return sectionReady(ctx, actor, templateId, date, input.sectionId);
      case "reopen-section":
        return reopenSection(ctx, actor, templateId, date, input.sectionId);
      case "close":
        return closeSheet(ctx, actor, templateId, date);
      default:
        throw new AppError("not_found");
    }
  };
  return Response.json({ sheet: await run() });
});
