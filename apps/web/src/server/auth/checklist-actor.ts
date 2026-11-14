// Quién llama a una ruta de checklists (spec 010): la persona con sesión y sucursal activa o, sin ella, el teléfono
// de piso de su cookie. Ninguna otra ruta acepta la cookie del teléfono (RF-39).
import { cookies } from "next/headers";
import { appCtx } from "../app-context";
import { AppError } from "../errors";
import { deviceActor, type ChecklistActor } from "../services/checklists/actor";
import { floorDeviceFromToken } from "../services/checklists/floor";
import { requireCatalogScope } from "./catalog-scope";
import { FLOOR_COOKIE, readCookie, SESSION_COOKIE } from "./cookies";

export async function requireChecklistActor(request: Request, employeeId?: unknown): Promise<ChecklistActor> {
  const floor = readCookie(request, FLOOR_COOKIE);
  if (readCookie(request, SESSION_COOKIE) || !floor) {
    try {
      return { kind: "user", scope: await requireCatalogScope(request) };
    } catch (e) {
      if (!floor || !(e instanceof AppError) || e.code !== "unauthorized") throw e;
    }
  }
  return deviceActor(appCtx(), await floorDeviceFromToken(appCtx(), floor), employeeId);
}

/** Solo el teléfono de piso (sus empleados). */
export async function requireFloorDevice(request: Request) {
  return floorDeviceFromToken(appCtx(), readCookie(request, FLOOR_COOKIE));
}

/** Para las páginas de `/piso`: el teléfono de la cookie o null. */
export async function currentFloorDevice() {
  const token = (await cookies()).get(FLOOR_COOKIE)?.value;
  if (!token) return null;
  return floorDeviceFromToken(appCtx(), token).catch(() => null);
}
