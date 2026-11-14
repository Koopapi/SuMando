// Spec 011 RF-15 a RF-39: movimientos, conteo y entrega (persona o teléfono); reporte, cierre y reapertura (personas).
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireChecklistActor } from "@/server/auth/checklist-actor";
import { AppError } from "@/server/errors";
import { handler, readJson } from "@/server/http";
import { addMovement, cancelMovement, capturePos, closeCut, deliverCount, reopenCut, saveCount } from "@/server/services/cash/cuts";

const body = z.object({
  employeeId: z.string().nullish(),
  kind: z.string().optional(),
  concept: z.string().optional(),
  amount: z.string().optional(),
  movementId: z.string().optional(),
  reason: z.string().optional(),
  pieces: z.record(z.string(), z.number()).optional(),
  amounts: z.record(z.string(), z.string()).optional(),
  note: z.string().optional(),
});

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string; action: string }> }) => {
  const input = await readJson(request, body);
  const actor = await requireChecklistActor(request, input.employeeId);
  const { id, action } = await params;
  const ctx = appCtx();
  const count = { pieces: input.pieces ?? {}, amounts: input.amounts ?? {} };
  const run = () => {
    switch (action) {
      case "movement":
        return addMovement(ctx, actor, id, { kind: input.kind, concept: input.concept, amount: input.amount });
      case "cancel-movement":
        return cancelMovement(ctx, actor, id, input.movementId, input.reason);
      case "count":
        return saveCount(ctx, actor, id, count);
      case "deliver":
        return deliverCount(ctx, actor, id, count);
      case "pos":
        return capturePos(ctx, actor, id, input.amounts ?? {});
      case "close":
        return closeCut(ctx, actor, id, input.note);
      case "reopen":
        return reopenCut(ctx, actor, id, input.reason);
      default:
        throw new AppError("not_found");
    }
  };
  return Response.json({ cut: await run() });
});
