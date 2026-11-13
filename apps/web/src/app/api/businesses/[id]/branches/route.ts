// RF-18, RF-19: añadir una sucursal a un negocio.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireOwner } from "@/server/auth/session";
import { handler, readJson } from "@/server/http";
import { addBranch, branchView } from "@/server/services/businesses";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { user } = await requireOwner(request);
  const input = await readJson(request, z.object({ name: z.string() }));
  const branch = await addBranch(appCtx(), user, (await params).id, input);
  return Response.json({ branch: branchView(branch) }, { status: 201 });
});
