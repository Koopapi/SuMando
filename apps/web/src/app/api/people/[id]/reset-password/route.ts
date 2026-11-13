// RF-11, RF-14: contraseña temporal nueva.
import { appCtx } from "@/server/app-context";
import { requireOwner } from "@/server/auth/session";
import { handler } from "@/server/http";
import { resetPersonPassword } from "@/server/services/people";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { user } = await requireOwner(request);
  return Response.json({ temporaryPassword: await resetPersonPassword(appCtx(), user, (await params).id) });
});
