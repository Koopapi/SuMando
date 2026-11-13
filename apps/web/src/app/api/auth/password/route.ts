// RF-13, RF-15, RF-16: cambiar la contraseña (también la temporal, RF-12).
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { passwordChangeCookie } from "@/server/auth/cookies";
import { requireSession } from "@/server/auth/session";
import { handler, readJson } from "@/server/http";
import { changePassword } from "@/server/services/auth";

const Body = z.object({ currentPassword: z.string(), newPassword: z.string() });

export const POST = handler(async (request: Request) => {
  const session = await requireSession(request, { allowPasswordChange: true });
  const input = await readJson(request, Body);
  await changePassword(appCtx(), session.user.id, input);
  const response = new Response(null, { status: 204 });
  response.headers.append("set-cookie", passwordChangeCookie(false));
  return response;
});
