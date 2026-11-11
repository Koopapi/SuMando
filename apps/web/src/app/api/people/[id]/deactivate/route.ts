// RF-28, RF-30: desactivar.
import { appCtx } from "@/server/app-context";
import { requireOwner } from "@/server/auth/session";
import { handler } from "@/server/http";
import { deactivatePerson } from "@/server/services/people";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { user } = await requireOwner(request);
  return Response.json({ person: await deactivatePerson(appCtx(), user, (await params).id) });
});
