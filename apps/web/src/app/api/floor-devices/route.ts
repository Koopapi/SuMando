// Spec 010 RF-37, RF-43: teléfonos de piso de la sucursal activa y habilitar este teléfono. Al habilitarlo se cierra
// la sesión de la persona en este teléfono: queda solo con la cookie de piso.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { floorCookie, readCookie, SESSION_COOKIE } from "@/server/auth/cookies";
import { withoutSessionCookies } from "@/server/auth/session";
import { handler, readJson } from "@/server/http";
import { authenticate, logout } from "@/server/services/auth";
import { enableFloorDevice, listFloorDevices } from "@/server/services/checklists/floor";

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  return Response.json({ devices: await listFloorDevices(appCtx(), scope) });
});

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const { name } = await readJson(request, z.object({ name: z.string() }));
  const ctx = appCtx();
  const { device, token } = await enableFloorDevice(ctx, scope, name);
  const auth = await authenticate(ctx, readCookie(request, SESSION_COOKIE) ?? "");
  if (auth) await logout(ctx, auth.sessionId);
  const res = withoutSessionCookies(Response.json({ device: { id: device.id, name: device.name } }, { status: 201 }));
  res.headers.append("set-cookie", floorCookie(token));
  return res;
});
