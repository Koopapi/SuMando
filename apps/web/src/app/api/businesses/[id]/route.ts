// RF-18, RF-19: renombrar un negocio.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireOwner } from "@/server/auth/session";
import { handler, readJson } from "@/server/http";
import { renameBusiness } from "@/server/services/businesses";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (request: Request, { params }: Ctx) => {
  const { user } = await requireOwner(request);
  const { id } = await params;
  const input = await readJson(request, z.object({ name: z.string() }));
  const business = await renameBusiness(appCtx(), user, id, input);
  return Response.json({ business: { id: business.id, name: business.name, archived: business.archivedAt !== null } });
});
