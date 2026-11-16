// Quién llena un checklist (spec 010): una persona con sesión y sucursal activa, o un teléfono de piso de una
// sucursal con el empleado que eligió su nombre (RF-38 a RF-41).
import type { Branch, Business, Employee, FloorDevice } from "@/db/schema";
import { AppError } from "../../errors";
import type { CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { uuidOrNotFound } from "../inventory/shared";

export type ChecklistActor =
  | { kind: "user"; scope: CatalogScope }
  | { kind: "device"; device: FloorDevice; branch: Branch; business: Business; employee: Employee | null };

export const actorBranch = (a: ChecklistActor) => (a.kind === "user" ? a.scope.active.branch : a.branch);
export const actorBusiness = (a: ChecklistActor) => (a.kind === "user" ? a.scope.active.business : a.business);

/** Nombre e ids que se guardan con cada marca (RF-20, RF-41). */
export function signature(a: ChecklistActor) {
  if (a.kind === "user") return { name: a.scope.actor.name, userId: a.scope.actor.id, employeeId: null, deviceId: null };
  if (!a.employee) throw new AppError("employee_required");
  return { name: a.employee.name, userId: null, employeeId: a.employee.id, deviceId: a.device.id };
}

/** RF-40: el empleado que eligió su nombre debe estar activo en la sucursal del teléfono. */
export async function deviceActor(ctx: Ctx, base: { device: FloorDevice; branch: Branch; business: Business }, employeeId: unknown): Promise<ChecklistActor> {
  if (employeeId === undefined || employeeId === null || employeeId === "") return { kind: "device", ...base, employee: null };
  const e = await ctx.store.personnel.employees.findById(uuidOrNotFound(employeeId));
  if (!e || e.branchId !== base.branch.id || !e.active) throw new AppError("employee_required");
  return { kind: "device", ...base, employee: e };
}
