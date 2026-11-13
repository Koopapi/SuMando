// RF-23 a RF-26, RF-31: personas (solo el dueño).
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireOwner } from "@/server/auth/session";
import { handler, readJson } from "@/server/http";
import { createPerson, listPeople } from "@/server/services/people";

const Body = z.object({ name: z.string(), email: z.string(), role: z.string(), branchIds: z.array(z.string()).default([]) });

export const GET = handler(async (request: Request) => {
  const { user } = await requireOwner(request);
  return Response.json({ people: await listPeople(appCtx(), user) });
});

export const POST = handler(async (request: Request) => {
  const { user } = await requireOwner(request);
  const input = await readJson(request, Body);
  return Response.json(await createPerson(appCtx(), user, input), { status: 201 });
});
