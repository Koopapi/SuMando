// Teléfonos de piso (spec 010, RF-37 a RF-45): una sesión de la sucursal, sin cuenta, que solo llena las hojas de
// hoy. En BD solo queda el hash de su token; queda habilitado hasta que lo deshabiliten.
import type { Branch, Business, FloorDevice } from "@/db/schema";
import { DEVICE_NAME_MAX } from "@/domain/checklists/template";
import { normalizeName } from "@/domain/text";
import { AppError } from "../../errors";
import { recordAudit } from "../audit";
import type { CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { uuidOrNotFound } from "../inventory/shared";

export interface FloorDeviceView {
  id: string;
  name: string;
  enabledBy: string;
  createdAt: string;
  lastUsedAt: string | null;
  disabledAt: string | null;
}

export interface FloorEmployeeView {
  id: string;
  name: string;
  position: string;
  positionId: string;
}

/** RF-37: habilita este teléfono para la sucursal activa; devuelve el token que va en su cookie. */
export async function enableFloorDevice(ctx: Ctx, scope: CatalogScope, rawName: unknown): Promise<{ device: FloorDevice; token: string }> {
  const name = normalizeName(typeof rawName === "string" ? rawName : "");
  if (!name || name.length > DEVICE_NAME_MAX) throw new AppError("name_invalid", { max: DEVICE_NAME_MAX });
  const token = ctx.ports.tokens.generate();
  const now = ctx.ports.clock.now();
  const device = await ctx.store.transaction(async (repos) => {
    const d = await repos.checklists.devices.insert({ businessId: scope.active.business.id, branchId: scope.active.branch.id, name, tokenHash: ctx.ports.tokens.hash(token), enabledBy: scope.actor.id, createdAt: now });
    await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "floor_device.enabled", entityType: "floor_device", entityId: d.id, businessId: d.businessId, branchId: d.branchId, after: { name } });
    return d;
  });
  return { device, token };
}

/** RF-43: teléfonos de la sucursal activa con quién los habilitó y su último uso. */
export async function listFloorDevices(ctx: Ctx, scope: CatalogScope): Promise<FloorDeviceView[]> {
  const [devices, users] = await Promise.all([ctx.store.checklists.devices.listByBranch(scope.active.branch.id), ctx.store.users.list()]);
  return devices.map((d) => ({
    id: d.id,
    name: d.name,
    enabledBy: users.find((u) => u.id === d.enabledBy)?.name ?? "",
    createdAt: d.createdAt.toISOString(),
    lastUsedAt: d.lastUsedAt?.toISOString() ?? null,
    disabledAt: d.disabledAt?.toISOString() ?? null,
  }));
}

/** RF-44: deshabilitar corta el teléfono de inmediato. */
export async function disableFloorDevice(ctx: Ctx, scope: CatalogScope, id: string): Promise<void> {
  const now = ctx.ports.clock.now();
  await ctx.store.transaction(async (repos) => {
    const d = await repos.checklists.devices.findById(uuidOrNotFound(id));
    if (!d || d.branchId !== scope.active.branch.id) throw new AppError("not_found");
    if (d.disabledAt) return;
    await repos.checklists.devices.update(d.id, { disabledAt: now, disabledBy: scope.actor.id });
    await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "floor_device.disabled", entityType: "floor_device", entityId: d.id, businessId: d.businessId, branchId: d.branchId, before: { disabled: false }, after: { disabled: true } });
  });
}

/** El teléfono de la cookie, si sigue habilitado (RF-42, RF-44); anota su último uso cada minuto como mucho. */
export async function floorDeviceFromToken(ctx: Ctx, token: string | undefined): Promise<{ device: FloorDevice; branch: Branch; business: Business }> {
  if (!token) throw new AppError("unauthorized");
  const d = await ctx.store.checklists.devices.findByTokenHash(ctx.ports.tokens.hash(token));
  if (!d) throw new AppError("unauthorized");
  if (d.disabledAt) throw new AppError("device_disabled");
  const now = ctx.ports.clock.now();
  const device = !d.lastUsedAt || now.getTime() - d.lastUsedAt.getTime() > 60_000 ? await ctx.store.checklists.devices.update(d.id, { lastUsedAt: now }) : d;
  const [branch, business] = await Promise.all([ctx.store.branches.findById(d.branchId), ctx.store.businesses.findById(d.businessId)]);
  if (!branch || !business) throw new AppError("unauthorized");
  return { device, branch, business };
}

/** RF-40: empleados activos de la sucursal del teléfono, para elegir el nombre. */
export async function floorEmployees(ctx: Ctx, branchId: string, businessId: string): Promise<FloorEmployeeView[]> {
  const [list, positions] = await Promise.all([ctx.store.personnel.employees.listByBranch(branchId), ctx.store.personnel.positions.listByBusiness(businessId)]);
  return list.filter((e) => e.active).map((e) => ({ id: e.id, name: e.name, positionId: e.positionId, position: positions.find((p) => p.id === e.positionId)?.name ?? "" }));
}
