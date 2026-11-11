// Reloj de pruebas (plan 001, sección 3): adelanta la hora del servidor en desarrollo y E2E. 404 sin DEV_ENDPOINTS=1.
import { z } from "zod";
import { clockOffset, setClockOffset } from "@/server/clock";
import { handler, readJson, requireDevEndpoints } from "@/server/http";

const Body = z.object({
  advanceDays: z.number().optional(),
  advanceHours: z.number().optional(),
  advanceMinutes: z.number().optional(),
});

export const POST = handler(async (request: Request) => {
  requireDevEndpoints();
  const { advanceDays = 0, advanceHours = 0, advanceMinutes = 0 } = await readJson(request, Body);
  setClockOffset(clockOffset() + ((advanceDays * 24 + advanceHours) * 60 + advanceMinutes) * 60_000);
  return Response.json({ offsetMs: clockOffset() });
});

export const DELETE = handler(async () => {
  requireDevEndpoints();
  setClockOffset(0);
  return new Response(null, { status: 204 });
});
