import type { User } from "@/db/schema";

/** Lo que de un usuario puede salir del servidor o ir al registro de cambios: nunca el hash ni los contadores. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: User["role"];
  mustChangePassword: boolean;
  isActive: boolean;
  lastBranchId: string | null;
  createdAt: Date;
}

export function publicUser(u: User): PublicUser {
  return { id: u.id, name: u.name, email: u.email, role: u.role, mustChangePassword: u.mustChangePassword, isActive: u.isActive, lastBranchId: u.lastBranchId, createdAt: u.createdAt };
}
