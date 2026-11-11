// Quién soy y en qué sucursal estoy (las sucursales llegan en la entrega 5).
import { requireSession } from "@/server/auth/session";
import { handler } from "@/server/http";

export const GET = handler(async (request: Request) => {
  const session = await requireSession(request);
  return Response.json({ user: session.user, activeBranchId: session.activeBranchId });
});
