// Spec 005 RF-11 a RF-20, RF-62: registrar una entrada, salida o ajuste, y la lista de movimientos.
import { z } from "zod";
import { appCtx } from "@/server/app-context";
import { requireCatalogScope } from "@/server/auth/catalog-scope";
import { AppError } from "@/server/errors";
import { handler, readJson } from "@/server/http";
import { listMovements, parseCursor, recordMovement } from "@/server/services/inventory/movements";
import { INVENTORY_BODY_BYTES, lineBody } from "../schema";

const date = (raw: string | null) => {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new AppError("validation");
  return d;
};

export const GET = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const q = new URL(request.url).searchParams;
  return Response.json(await listMovements(appCtx(), scope, { kind: q.get("kind"), warehouseId: q.get("warehouseId"), from: date(q.get("from")), to: date(q.get("to")), before: parseCursor(q.get("before")) }));
});

const body = z.object({
  kind: z.enum(["entry", "exit", "adjustment"]),
  warehouseId: z.string(),
  lines: z.array(lineBody),
  supplierId: z.string().nullish(),
  reference: z.string().nullish(),
  note: z.string().nullish(),
  reason: z.string().nullish(),
});

export const POST = handler(async (request: Request) => {
  const scope = await requireCatalogScope(request);
  const input = await readJson(request, body, INVENTORY_BODY_BYTES);
  const m = await recordMovement(appCtx(), scope, input);
  return Response.json({ movement: { id: m.id, kind: m.kind, createdAt: m.createdAt.toISOString() } }, { status: 201 });
});
