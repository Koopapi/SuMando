// Solo desarrollo y E2E: pone una contraseña temporal a una cuenta y la devuelve (como haría el dueño en Personas).
import { z } from "zod";
import { normalizeEmail } from "@/domain/text";
import { appCtx } from "@/server/app-context";
import { AppError } from "@/server/errors";
import { handler, readJson, requireDevEndpoints } from "@/server/http";
import { issueTemporaryPassword } from "@/server/services/auth";

export const POST = handler(async (request: Request) => {
  requireDevEndpoints();
  const { email } = await readJson(request, z.object({ email: z.string() }));
  const ctx = appCtx();
  const user = await ctx.store.users.findByEmail(normalizeEmail(email));
  if (!user) throw new AppError("not_found");
  const temporaryPassword = await ctx.store.transaction((repos) => issueTemporaryPassword(repos, ctx.ports, user, user.id, "user.password_reset"));
  return Response.json({ temporaryPassword });
});
