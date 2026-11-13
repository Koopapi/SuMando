// RF-22: reactivar un negocio (y sus sucursales).
import { appCtx } from "@/server/app-context";
import { requireOwner } from "@/server/auth/session";
import { handler } from "@/server/http";
import { reactivateBusiness } from "@/server/services/businesses";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { user } = await requireOwner(request);
  const business = await reactivateBusiness(appCtx(), user, (await params).id);
  return Response.json({ business: { id: business.id, name: business.name, archived: business.archivedAt !== null } });
});
