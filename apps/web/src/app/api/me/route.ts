// Quién soy, en qué sucursal estoy y entre cuáles puedo elegir.
import { appCtx } from "@/server/app-context";
import { requireSession } from "@/server/auth/session";
import { handler } from "@/server/http";
import { activeBranchView, branchChoices, resolveBranchState } from "@/server/services/active-branch";

export const GET = handler(async (request: Request) => {
  const session = await requireSession(request);
  const ctx = appCtx();
  const [state, choices] = await Promise.all([resolveBranchState(ctx, session), branchChoices(ctx, session.user)]);
  return Response.json({ user: session.user, activeBranch: state.kind === "active" ? activeBranchView(state.active) : null, state: state.kind, choices });
});
