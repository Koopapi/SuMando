// RF-17, RF-31: negocios (solo el dueño).
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireOwner } from "@/server/auth/session";
import { handler, readJson } from "@/server/http";
import { branchView, businessView, createBusiness, listBusinesses } from "@/server/services/businesses";

export const GET = handler(async (request: Request) => {
  const { user } = await requireOwner(request);
  return Response.json({ businesses: (await listBusinesses(appCtx(), user)).map(businessView) });
});

export const POST = handler(async (request: Request) => {
  const { user } = await requireOwner(request);
  const input = await readJson(request, z.object({ name: z.string(), firstBranchName: z.string() }));
  const { business, branch } = await createBusiness(appCtx(), user, input);
  return Response.json({ business: businessView({ ...business, branches: [branch] }), branch: branchView(branch) }, { status: 201 });
});
