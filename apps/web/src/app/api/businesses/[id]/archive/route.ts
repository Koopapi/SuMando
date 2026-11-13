// RF-21: archivar un negocio (y sus sucursales).
import { appCtx } from "@/server/app-context";
import { requireOwner } from "@/server/auth/session";
import { handler } from "@/server/http";
import { archiveBusiness } from "@/server/services/businesses";

export const POST = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { user } = await requireOwner(request);
  const business = await archiveBusiness(appCtx(), user, (await params).id);
  return Response.json({ business: { id: business.id, name: business.name, archived: business.archivedAt !== null } });
});
