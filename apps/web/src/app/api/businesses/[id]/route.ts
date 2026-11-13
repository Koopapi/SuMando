// RF-18, RF-19: renombrar un negocio.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireOwner } from "@/server/auth/session";
import { handler, readJson } from "@/server/http";
import { updateBusiness } from "@/server/services/businesses";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (request: Request, { params }: Ctx) => {
  const { user } = await requireOwner(request);
  const { id } = await params;
  // Spec 001 RF-19 (nombre) y spec 002 RF-9 (color): uno, otro o los dos.
  const input = await readJson(request, z.object({ name: z.string().optional(), color: z.unknown().optional() }));
  const business = await updateBusiness(appCtx(), user, id, input);
  return Response.json({ business: { id: business.id, name: business.name, color: business.color, archived: business.archivedAt !== null } });
});
