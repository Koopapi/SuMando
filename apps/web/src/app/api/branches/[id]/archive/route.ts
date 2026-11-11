// RF-21: archivar una sucursal.
import { appCtx } from "@/server/app-context";
import { requireOwner } from "@/server/auth/session";
import { handler } from "@/server/http";
import { archiveBranch, branchView } from "@/server/services/businesses";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { user } = await requireOwner(request);
  return Response.json({ branch: branchView(await archiveBranch(appCtx(), user, (await params).id)) });
});
