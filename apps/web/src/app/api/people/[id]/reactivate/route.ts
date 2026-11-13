// RF-29: reactivar con contraseña temporal nueva.
import { appCtx } from "@/server/app-context";
import { requireOwner } from "@/server/auth/session";
import { handler } from "@/server/http";
import { reactivatePerson } from "@/server/services/people";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { user } = await requireOwner(request);
  return Response.json(await reactivatePerson(appCtx(), user, (await params).id));
});
