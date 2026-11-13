// RF-1 a RF-3: primer arranque.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { withSessionCookies } from "@/server/auth/session";
import { handler, readJson } from "@/server/http";
import { createFirstOwner, isSetupNeeded } from "@/server/services/setup";

const Body = z.object({ name: z.string(), email: z.string(), password: z.string() });

export const GET = handler(async () => Response.json({ needed: await isSetupNeeded(appCtx()) }));

export const POST = handler(async (request: Request) => {
  const input = await readJson(request, Body);
  const result = await createFirstOwner(appCtx(), input, { userAgent: request.headers.get("user-agent") });
  return withSessionCookies(Response.json({ user: result.user }, { status: 201 }), result);
});
