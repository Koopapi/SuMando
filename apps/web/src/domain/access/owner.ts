// RF-31: crear, cambiar, archivar o reactivar negocios, sucursales y personas es cosa del dueño.
export function isOwner(user: { role: "owner" | "admin" }): boolean {
  return user.role === "owner";
}
