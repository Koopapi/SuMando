// Guardias para páginas (componentes de servidor): redirigen en vez de responder un error.
import { redirect } from "next/navigation";
import { isOwner } from "@/domain/access/owner";
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
