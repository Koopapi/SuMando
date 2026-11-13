// RF-4 a RF-6, RF-9: entrar.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { PASSWORD_CHANGE_PATH } from "@/server/auth/page-guards";
import { withSessionCookies } from "@/server/auth/session";
import { handler, readJson } from "@/server/http";
import { login } from "@/server/services/auth";

const Body = z.object({ email: z.string(), password: z.string() });

export const POST = handler(async (request: Request) => {
  const input = await readJson(request, Body);
  const result = await login(appCtx(), input, { userAgent: request.headers.get("user-agent") });
  const next = result.user.mustChangePassword ? PASSWORD_CHANGE_PATH : "/";
  return withSessionCookies(Response.json({ next, user: result.user }), result);
});
