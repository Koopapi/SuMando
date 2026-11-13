// RF-18, RF-19: renombrar una sucursal.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireOwner } from "@/server/auth/session";
import { handler, readJson } from "@/server/http";
import { branchView, renameBranch } from "@/server/services/businesses";

export const PATCH = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { user } = await requireOwner(request);
  const input = await readJson(request, z.object({ name: z.string() }));
  const branch = await renameBranch(appCtx(), user, (await params).id, input);
  return Response.json({ branch: branchView(branch) });
});
