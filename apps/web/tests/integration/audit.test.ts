// Spec 001, RF-42: el registro de cambios va en la misma transacción que el cambio.
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { recordAudit } from "@/server/services/audit";
import { createBusiness } from "@/server/services/businesses";
import { createFirstOwner } from "@/server/services/setup";
import { makeCtx, OWNER } from "./helpers";

describe("spec 001 — registro de cambios", () => {
  it("test_s001_rf42_un_cambio_que_falla_no_deja_registro", async () => {
    const ctx = makeCtx();
    await expect(
      ctx.store.transaction(async (repos) => {
        await recordAudit(repos.audit, ctx.clock.now(), { actorId: null, action: "prueba", entityType: "business", entityId: "00000000-0000-4000-8000-000000000000" });
        throw new Error("algo falló después de anotar");
      }),
    ).rejects.toThrow("algo falló");
    expect(await db.select().from(auditLog)).toHaveLength(0);
  });

  it("test_s001_rf42_cada_alta_guarda_autor_fecha_y_valor_posterior_sin_valor_anterior", async () => {
    const ctx = makeCtx();
    const owner = await createFirstOwner(ctx, OWNER);
    ctx.clock.advanceMinutes(5);
    const { business, branch } = await createBusiness(ctx, owner.user, { name: "Pastatti", firstBranchName: "Sendero", color: "violeta" });
    const rows = await db.select().from(auditLog);
    const created = rows.filter((r) => r.action.endsWith(".created"));
    expect(created.map((r) => r.action).sort()).toEqual(["branch.created", "business.created", "user.created"]);
    const biz = rows.find((r) => r.entityType === "business")!;
    expect(biz).toMatchObject({ actorId: owner.user.id, entityId: business.id, businessId: business.id, before: null, after: { name: "Pastatti" } });
    expect(biz.createdAt).toEqual(ctx.clock.now());
    expect(rows.find((r) => r.entityType === "branch")).toMatchObject({ entityId: branch.id, branchId: branch.id, after: { name: "Sendero" } });
  });
});
