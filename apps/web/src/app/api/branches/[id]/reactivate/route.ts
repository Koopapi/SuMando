// RF-22: reactivar una sucursal.
import { appCtx } from "@/server/app-context";
import { requireOwner } from "@/server/auth/session";
import { handler } from "@/server/http";
import { branchView, reactivateBranch } from "@/server/services/businesses";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { user } = await requireOwner(request);
  return Response.json({ branch: branchView(await reactivateBranch(appCtx(), user, (await params).id)) });
});
