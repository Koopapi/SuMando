// Spec 001, RF-17 a RF-22, RF-31: negocios y sucursales.
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { auditEntriesFor } from "@/server/adapters/drizzle/store";
import { addBranch, archiveBranch, archiveBusiness, createBusiness, listBusinesses, reactivateBranch, reactivateBusiness, renameBranch, renameBusiness } from "@/server/services/businesses";
import { createFirstOwner } from "@/server/services/setup";
import { publicUser } from "@/server/services/users-public";
import { makeCtx, OWNER } from "./helpers";

async function owner(ctx: ReturnType<typeof makeCtx>) {
  return (await createFirstOwner(ctx, OWNER)).user;
}

describe("spec 001 — negocios y sucursales", () => {
  it("test_s001_rf17_crea_el_negocio_con_su_primera_sucursal", async () => {
    const ctx = makeCtx();
    const actor = await owner(ctx);
    const { business, branch } = await createBusiness(ctx, actor, { name: "  Pastatti ", firstBranchName: "Sendero" });
    expect(business).toMatchObject({ name: "Pastatti", nameKey: "pastatti", archivedAt: null, createdBy: actor.id });
    expect(branch).toMatchObject({ businessId: business.id, name: "Sendero", archivedAt: null });
    const list = await listBusinesses(ctx, actor);
    expect(list).toHaveLength(1);
    expect(list[0].branches.map((b) => b.name)).toEqual(["Sendero"]);
  });

  it("test_s001_rf18_anade_sucursales_y_renombra_negocios_y_sucursales", async () => {
    const ctx = makeCtx();
    const actor = await owner(ctx);
    const { business, branch } = await createBusiness(ctx, actor, { name: "Pastatti", firstBranchName: "Sendero" });
    const centro = await addBranch(ctx, actor, business.id, { name: "Centro" });
    expect(centro.businessId).toBe(business.id);
    expect((await renameBusiness(ctx, actor, business.id, { name: "Pastatti MX" })).name).toBe("Pastatti MX");
    expect((await renameBranch(ctx, actor, branch.id, { name: "Sendero Norte" })).name).toBe("Sendero Norte");
    const audit = await auditEntriesFor(db, "business", business.id);
    expect(audit.map((a) => a.action)).toContain("business.renamed");
    expect(audit.find((a) => a.action === "business.renamed")).toMatchObject({ before: { name: "Pastatti" }, after: { name: "Pastatti MX" } });
  });

  it("test_s001_rf19_rechaza_duplicados_ignorando_mayusculas_y_espacios_pero_permite_la_misma_sucursal_en_otro_negocio", async () => {
    const ctx = makeCtx();
    const actor = await owner(ctx);
    const { business } = await createBusiness(ctx, actor, { name: "Pastatti", firstBranchName: "Centro" });
    await expect(createBusiness(ctx, actor, { name: "  PASTATTI ", firstBranchName: "Otra" })).rejects.toMatchObject({ code: "duplicate_name", status: 409 });
    await expect(addBranch(ctx, actor, business.id, { name: "centro " })).rejects.toMatchObject({ code: "duplicate_name" });
    const pirrus = await createBusiness(ctx, actor, { name: "Pirrus", firstBranchName: "Centro" });
    expect(pirrus.branch.name).toBe("Centro");
    await expect(renameBusiness(ctx, actor, pirrus.business.id, { name: "pastatti" })).rejects.toMatchObject({ code: "duplicate_name" });
    expect((await renameBusiness(ctx, actor, pirrus.business.id, { name: "PIRRUS" })).name).toBe("PIRRUS");
  });

  it("test_s001_rf20_rechaza_nombres_vacios_o_de_mas_de_60_caracteres", async () => {
    const ctx = makeCtx();
    const actor = await owner(ctx);
    await expect(createBusiness(ctx, actor, { name: "   ", firstBranchName: "Centro" })).rejects.toMatchObject({ code: "name_invalid", params: { max: 60 } });
    await expect(createBusiness(ctx, actor, { name: "Pastatti", firstBranchName: "x".repeat(61) })).rejects.toMatchObject({ code: "name_invalid" });
    expect(await listBusinesses(ctx, actor)).toHaveLength(0);
  });

  it("test_s001_rf21_archivar_un_negocio_archiva_sus_sucursales_y_no_borra_nada", async () => {
    const ctx = makeCtx();
    const actor = await owner(ctx);
    const { business } = await createBusiness(ctx, actor, { name: "Pastatti", firstBranchName: "Sendero" });
    await addBranch(ctx, actor, business.id, { name: "Centro" });
    ctx.clock.advanceMinutes(1);
    const archived = await archiveBusiness(ctx, actor, business.id);
    expect(archived.archivedAt).toEqual(ctx.clock.now());
    const [listed] = await listBusinesses(ctx, actor);
    expect(listed.archivedAt).not.toBeNull();
    expect(listed.branches.every((b) => b.archivedAt !== null)).toBe(true);
    expect(listed.branches).toHaveLength(2);
    expect((await auditEntriesFor(db, "branch", listed.branches[0].id)).map((a) => a.action)).toContain("branch.archived");
  });

  it("test_s001_rf21_rf22_archivar_y_reactivar_una_sucursal_suelta", async () => {
    const ctx = makeCtx();
    const actor = await owner(ctx);
    const { business, branch } = await createBusiness(ctx, actor, { name: "Pastatti", firstBranchName: "Sendero" });
    expect((await archiveBranch(ctx, actor, branch.id)).archivedAt).not.toBeNull();
    expect((await reactivateBranch(ctx, actor, branch.id)).archivedAt).toBeNull();
    await archiveBusiness(ctx, actor, business.id);
    await expect(reactivateBranch(ctx, actor, branch.id)).rejects.toMatchObject({ code: "business_archived" });
    await expect(addBranch(ctx, actor, business.id, { name: "Centro" })).rejects.toMatchObject({ code: "business_archived" });
  });

  it("test_s001_rf22_reactivar_un_negocio_devuelve_sus_sucursales", async () => {
    const ctx = makeCtx();
    const actor = await owner(ctx);
    const { business } = await createBusiness(ctx, actor, { name: "Pastatti", firstBranchName: "Sendero" });
    await archiveBusiness(ctx, actor, business.id);
    const back = await reactivateBusiness(ctx, actor, business.id);
    expect(back.archivedAt).toBeNull();
    const [listed] = await listBusinesses(ctx, actor);
    expect(listed.branches.every((b) => b.archivedAt === null)).toBe(true);
  });

  it("test_s001_rf31_un_administrador_no_puede_tocar_negocios_ni_sucursales", async () => {
    const ctx = makeCtx();
    const actor = await owner(ctx);
    const { business, branch } = await createBusiness(ctx, actor, { name: "Pastatti", firstBranchName: "Sendero" });
    const admin = publicUser(await ctx.store.users.insert({ name: "Admin", email: "admin@mando.test", passwordHash: "x", role: "admin", createdAt: ctx.clock.now() }));
    const calls = [
      () => listBusinesses(ctx, admin),
      () => createBusiness(ctx, admin, { name: "Otro", firstBranchName: "Centro" }),
      () => addBranch(ctx, admin, business.id, { name: "Centro" }),
      () => renameBusiness(ctx, admin, business.id, { name: "X" }),
      () => renameBranch(ctx, admin, branch.id, { name: "X" }),
      () => archiveBusiness(ctx, admin, business.id),
      () => archiveBranch(ctx, admin, branch.id),
      () => reactivateBusiness(ctx, admin, business.id),
      () => reactivateBranch(ctx, admin, branch.id),
    ];
    for (const call of calls) await expect(call()).rejects.toMatchObject({ code: "forbidden", status: 403 });
    await expect(renameBusiness(ctx, actor, "00000000-0000-4000-8000-000000000000", { name: "X" })).rejects.toMatchObject({ code: "not_found" });
  });
});
