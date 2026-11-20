// Lo capturado a medias en un asistente (spec 015, RF-17 a RF-22, RF-51). El servidor guarda `data` tal cual: no se
// registra nada hasta que el asistente confirma con las rutas de siempre, que validan como siempre.
import { DRAFT_MAX_BYTES, draftExpired, isFloorKind, isWizardKind, needsTarget, type WizardKind } from "@/domain/wizards/drafts";
import { AppError } from "../../errors";
import type { DraftKey } from "../../ports/wizards";
import { actorBranch, actorBusiness, type ChecklistActor } from "../checklists/actor";
import type { Ctx } from "../context";

export interface DraftView {
  step: string;
  data: unknown;
  updatedAt: Date;
}

const TARGET_MAX = 100;
const STEP_MAX = 40;

function keyOf(actor: ChecklistActor, rawKind: unknown, rawTarget: unknown): DraftKey {
  if (!isWizardKind(rawKind)) throw new AppError("wizard_unknown");
  const kind: WizardKind = rawKind;
  const target = rawTarget === undefined || rawTarget === null ? "" : String(rawTarget);
  if (target.length > TARGET_MAX || (needsTarget(kind) ? target === "" : target !== "")) throw new AppError("validation");
  if (actor.kind === "user") return { owner: { kind: "user", userId: actor.scope.actor.id, branchId: actorBranch(actor).id }, kind, target };
  // El teléfono de piso solo tiene sus asistentes, y siempre de un empleado elegido.
  if (!isFloorKind(kind)) throw new AppError("forbidden");
  if (!actor.employee) throw new AppError("employee_required");
  return { owner: { kind: "device", floorDeviceId: actor.device.id, employeeId: actor.employee.id }, kind, target };
}

export async function getDraft(ctx: Ctx, actor: ChecklistActor, kind: unknown, target: unknown): Promise<DraftView | null> {
  const key = keyOf(actor, kind, target);
  const row = await ctx.store.wizards.drafts.find(key);
  if (!row) return null;
  // RF-51: más de 7 días sin cambios se descarta y ya no se ofrece.
  if (draftExpired(row.updatedAt, ctx.ports.clock.now())) {
    await ctx.store.wizards.drafts.remove(key);
    return null;
  }
  return { step: row.step, data: row.data, updatedAt: row.updatedAt };
}

export async function saveDraft(ctx: Ctx, actor: ChecklistActor, kind: unknown, target: unknown, input: { step: unknown; data: unknown }): Promise<DraftView> {
  const key = keyOf(actor, kind, target);
  if (typeof input.step !== "string" || input.step === "" || input.step.length > STEP_MAX || input.data === undefined) throw new AppError("validation");
  if (Buffer.byteLength(JSON.stringify(input.data)) > DRAFT_MAX_BYTES) throw new AppError("draft_too_large");
  const row = await ctx.store.wizards.drafts.save(key, { businessId: actorBusiness(actor).id, branchId: actorBranch(actor).id, step: input.step, data: input.data, at: ctx.ports.clock.now() });
  return { step: row.step, data: row.data, updatedAt: row.updatedAt };
}

export async function discardDraft(ctx: Ctx, actor: ChecklistActor, kind: unknown, target: unknown): Promise<void> {
  await ctx.store.wizards.drafts.remove(keyOf(actor, kind, target));
}
