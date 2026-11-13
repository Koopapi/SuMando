// Guardias para páginas (componentes de servidor): redirigen en vez de responder un error.
import { redirect } from "next/navigation";
import { isOwner } from "@/domain/access/owner";
import { appCtx } from "../app-context";
import { resolveBranchState, type ActiveBranch } from "../services/active-branch";
import type { Authenticated } from "../services/auth";
import { currentSession } from "./session";

export const PASSWORD_CHANGE_PATH = "/cambiar-contrasena";

export async function requirePageSession(): Promise<Authenticated> {
  const session = await currentSession();
  if (!session) redirect("/login");
  if (session.user.mustChangePassword) redirect(PASSWORD_CHANGE_PATH);
  return session;
}

export async function requireOwnerPage(): Promise<Authenticated> {
  const session = await requirePageSession();
  if (!isOwner(session.user)) redirect("/");
  return session;
}

export const CHOOSE_BRANCH_PATH = "/elegir-sucursal";

/** Páginas que trabajan sobre una sucursal: sin activa, a elegir (RF-32, RF-36) o al aviso de RF-38. */
export async function requirePageBranch(): Promise<Authenticated & { active: ActiveBranch }> {
  const session = await requirePageSession();
  const state = await resolveBranchState(appCtx(), session);
  if (state.kind !== "active") redirect(CHOOSE_BRANCH_PATH);
  return { ...session, active: state.active };
}
