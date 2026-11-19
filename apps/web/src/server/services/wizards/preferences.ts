// Vista que eligió cada persona para cada tarea (spec 015, RF-23, RF-26): sin elección, el asistente.
import { isWizardKind, type WizardKind } from "@/domain/wizards/drafts";
import { AppError } from "../../errors";
import type { Ctx } from "../context";
import type { PublicUser } from "../users-public";

export type WizardView = "wizard" | "full";
const isView = (v: unknown): v is WizardView => v === "wizard" || v === "full";

/** Solo las tareas en que la persona eligió algo. */
export async function wizardViews(ctx: Ctx, actor: PublicUser): Promise<Partial<Record<WizardKind, WizardView>>> {
  const rows = await ctx.store.wizards.preferences.listByUser(actor.id);
  return Object.fromEntries(rows.filter((r) => isWizardKind(r.kind) && isView(r.view)).map((r) => [r.kind, r.view]));
}

export async function wizardView(ctx: Ctx, actor: PublicUser, kind: WizardKind): Promise<WizardView> {
  return (await wizardViews(ctx, actor))[kind] ?? "wizard";
}

export async function setWizardView(ctx: Ctx, actor: PublicUser, kind: unknown, view: unknown): Promise<WizardView> {
  if (!isWizardKind(kind)) throw new AppError("wizard_unknown");
  if (!isView(view)) throw new AppError("validation");
  await ctx.store.wizards.preferences.set(actor.id, kind, view, ctx.ports.clock.now());
  return view;
}
