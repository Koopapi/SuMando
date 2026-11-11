// RF-27, RF-30: cambiar nombre, rol y sucursales.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireOwner } from "@/server/auth/session";
import { handler, readJson } from "@/server/http";
import { updatePerson } from "@/server/services/people";

const Body = z.object({ name: z.string().optional(), role: z.string().optional(), branchIds: z.array(z.string()).optional() });

export const PATCH = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { user } = await requireOwner(request);
  const input = await readJson(request, Body);
  return Response.json({ person: await updatePerson(appCtx(), user, (await params).id, input) });
});
