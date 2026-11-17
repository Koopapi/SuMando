// Spec 014 RF-25 a RF-27 y RF-33: logo del negocio. El dueño lo sube (PNG en el cuerpo) o lo quita; lo ve quien
// tiene acceso al negocio.
import { appCtx } from "@/server/app-context";
import { requireOwner, requireSession } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { handler } from "@/server/http";
import { LOGO_MAX_BYTES } from "@/domain/business-logo";
import { logoVersion, readBusinessLogo, removeBusinessLogo, setBusinessLogo } from "@/server/services/business-logo";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (request: Request, { params }: Ctx) => {
  const { user } = await requireSession(request);
  const logo = await readBusinessLogo(appCtx(), user, (await params).id);
  if (!logo) throw new AppError("not_found");
  return new Response(new Uint8Array(logo.bytes), { headers: { "content-type": "image/png", "cache-control": "private, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
});

export const PUT = handler(async (request: Request, { params }: Ctx) => {
  const { user } = await requireOwner(request);
  if (Number(request.headers.get("content-length") ?? 0) > LOGO_MAX_BYTES) throw new AppError("logo_invalid");
  const bytes = new Uint8Array(await request.arrayBuffer());
  const b = await setBusinessLogo(appCtx(), user, (await params).id, bytes);
  return Response.json({ business: { id: b.id, logoVersion: logoVersion(b) } });
});

export const DELETE = handler(async (request: Request, { params }: Ctx) => {
  const { user } = await requireOwner(request);
  const b = await removeBusinessLogo(appCtx(), user, (await params).id);
  return Response.json({ business: { id: b.id, logoVersion: logoVersion(b) } });
});
