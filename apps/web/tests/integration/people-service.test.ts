// Spec 001, RF-11, RF-14, RF-23 a RF-31, RF-37: personas, accesos y aislamiento por sucursal.
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { auditEntriesFor } from "@/server/adapters/drizzle/store";
import { assertBranchAccess } from "@/server/services/access";
import { authenticate, login } from "@/server/services/auth";
import { createBusiness } from "@/server/services/businesses";
import { createPerson, deactivatePerson, listPeople, reactivatePerson, resetPersonPassword, updatePerson } from "@/server/services/people";
import { createFirstOwner } from "@/server/services/setup";
import { makeCtx, OWNER } from "./helpers";

async function world() {
  const ctx = makeCtx();
  const owner = (await createFirstOwner(ctx, OWNER)).user;
  const pastatti = await createBusiness(ctx, owner, { name: "Pastatti", firstBranchName: "Sendero", color: "violeta" });
  const pirrus = await createBusiness(ctx, owner, { name: "Pirrus", firstBranchName: "Centro", color: "violeta" });
  return { ctx, owner, sendero: pastatti.branch, centro: pirrus.branch, pastatti: pastatti.business };
}

describe("spec 001 — personas y accesos", () => {
  it("test_s001_rf11_rf23_da_de_alta_con_temporal_de_10_caracteres_guardada_hasheada_y_con_cambio_pendiente", async () => {
    const { ctx, owner, sendero } = await world();
    const { person, temporaryPassword } = await createPerson(ctx, owner, { name: " Admin Uno ", email: "Admin@Mando.test", role: "admin", branchIds: [sendero.id] });
    expect(temporaryPassword).toHaveLength(10);
    expect(person).toMatchObject({ name: "Admin Uno", email: "admin@mando.test", role: "admin", isActive: true, mustChangePassword: true, branchIds: [sendero.id] });
    const stored = await ctx.store.users.findById(person.id);
    expect(stored?.passwordHash).not.toContain(temporaryPassword);
    expect((await login(ctx, { email: "admin@mando.test", password: temporaryPassword })).user.mustChangePassword).toBe(true);
    expect((await auditEntriesFor(db, "user", person.id)).map((a) => a.action).sort()).toEqual(["user.created", "user.password_issued"]);
  });

  it("test_s001_rf24_rechaza_un_correo_ya_registrado_activo_o_desactivado", async () => {
    const { ctx, owner } = await world();
    const { person } = await createPerson(ctx, owner, { name: "Admin", email: "admin@mando.test", role: "admin", branchIds: [] });
    await expect(createPerson(ctx, owner, { name: "Otra", email: " ADMIN@mando.test", role: "admin", branchIds: [] })).rejects.toMatchObject({ code: "duplicate_email", status: 409 });
    await deactivatePerson(ctx, owner, person.id);
    await expect(createPerson(ctx, owner, { name: "Otra", email: "admin@mando.test", role: "admin", branchIds: [] })).rejects.toMatchObject({ code: "duplicate_email" });
    await expect(createPerson(ctx, owner, { name: "Otra", email: OWNER.email, role: "admin", branchIds: [] })).rejects.toMatchObject({ code: "duplicate_email" });
  });

  it("test_s001_rf25_rf27_asigna_y_cambia_las_sucursales_y_el_rol_de_un_administrador", async () => {
    const { ctx, owner, sendero, centro } = await world();
    const { person } = await createPerson(ctx, owner, { name: "Admin", email: "admin@mando.test", role: "admin", branchIds: [sendero.id] });
    const updated = await updatePerson(ctx, owner, person.id, { branchIds: [sendero.id, centro.id], name: "Admin Dos" });
    expect(updated.name).toBe("Admin Dos");
    expect(updated.branchIds.sort()).toEqual([sendero.id, centro.id].sort());
    const onlyCentro = await updatePerson(ctx, owner, person.id, { branchIds: [centro.id] });
    expect(onlyCentro.branchIds).toEqual([centro.id]);
    const promoted = await updatePerson(ctx, owner, person.id, { role: "owner" });
    expect(promoted).toMatchObject({ role: "owner", branchIds: [] });
    await expect(updatePerson(ctx, owner, person.id, { branchIds: ["00000000-0000-4000-8000-000000000000"] })).rejects.toMatchObject({ code: "validation" });
    expect((await listPeople(ctx, owner)).map((p) => p.email).sort()).toEqual(["admin@mando.test", OWNER.email]);
  });

  it("test_s001_rf26_rf37_el_dueno_accede_a_cualquier_sucursal_y_el_administrador_solo_a_las_suyas", async () => {
    const { ctx, owner, sendero, centro, pastatti } = await world();
    const { person } = await createPerson(ctx, owner, { name: "Admin", email: "admin@mando.test", role: "admin", branchIds: [sendero.id] });
    const admin = (await listPeople(ctx, owner)).find((p) => p.id === person.id)!;
    const adminUser = { ...admin, lastBranchId: null, createdAt: new Date() };
    expect((await assertBranchAccess(ctx, adminUser, sendero.id)).id).toBe(sendero.id);
    await expect(assertBranchAccess(ctx, adminUser, centro.id)).rejects.toMatchObject({ code: "not_found", status: 404 });
    await expect(assertBranchAccess(ctx, adminUser, "00000000-0000-4000-8000-000000000000")).rejects.toMatchObject({ code: "not_found", status: 404 });
    const later = await createBusiness(ctx, owner, { name: "Nuevo", firstBranchName: "Única", color: "violeta" });
    expect((await assertBranchAccess(ctx, owner, later.branch.id)).id).toBe(later.branch.id);
    expect((await assertBranchAccess(ctx, owner, centro.id)).id).toBe(centro.id);
    await ctx.store.branches.update(sendero.id, { archivedAt: ctx.clock.now(), updatedAt: ctx.clock.now() });
    await expect(assertBranchAccess(ctx, adminUser, sendero.id)).rejects.toMatchObject({ code: "not_found" });
    expect(pastatti.name).toBe("Pastatti");
  });

  it("test_s001_rf28_desactivar_cierra_sesiones_impide_entrar_y_conserva_el_nombre", async () => {
    const { ctx, owner, sendero } = await world();
    const { person, temporaryPassword } = await createPerson(ctx, owner, { name: "Admin", email: "admin@mando.test", role: "admin", branchIds: [sendero.id] });
    const session = await login(ctx, { email: "admin@mando.test", password: temporaryPassword });
    const off = await deactivatePerson(ctx, owner, person.id);
    expect(off.isActive).toBe(false);
    expect(await authenticate(ctx, session.token)).toBeNull();
    await expect(login(ctx, { email: "admin@mando.test", password: temporaryPassword })).rejects.toMatchObject({ code: "invalid_credentials" });
    expect((await ctx.store.users.findById(person.id))?.name).toBe("Admin");
    expect((await auditEntriesFor(db, "user", person.id)).find((a) => a.action === "user.deactivated")).toMatchObject({ before: { isActive: true }, after: { isActive: false, name: "Admin" } });
  });

  it("test_s001_rf29_reactivar_da_temporal_nueva_y_conserva_rol_y_sucursales", async () => {
    const { ctx, owner, sendero } = await world();
    const { person, temporaryPassword } = await createPerson(ctx, owner, { name: "Admin", email: "admin@mando.test", role: "admin", branchIds: [sendero.id] });
    await deactivatePerson(ctx, owner, person.id);
    const back = await reactivatePerson(ctx, owner, person.id);
    expect(back.temporaryPassword).toHaveLength(10);
    expect(back.temporaryPassword).not.toBe(temporaryPassword);
    expect(back.person).toMatchObject({ isActive: true, role: "admin", branchIds: [sendero.id], mustChangePassword: true });
    expect((await login(ctx, { email: "admin@mando.test", password: back.temporaryPassword })).user.mustChangePassword).toBe(true);
    await expect(reactivatePerson(ctx, owner, person.id)).rejects.toMatchObject({ code: "validation" });
  });

  it("test_s001_rf14_restablecer_cierra_las_sesiones_y_exige_el_cambio", async () => {
    const { ctx, owner } = await world();
    const { person, temporaryPassword } = await createPerson(ctx, owner, { name: "Admin", email: "admin@mando.test", role: "admin", branchIds: [] });
    const session = await login(ctx, { email: "admin@mando.test", password: temporaryPassword });
    const fresh = await resetPersonPassword(ctx, owner, person.id);
    expect(await authenticate(ctx, session.token)).toBeNull();
    await expect(login(ctx, { email: "admin@mando.test", password: temporaryPassword })).rejects.toMatchObject({ code: "invalid_credentials" });
    expect((await login(ctx, { email: "admin@mando.test", password: fresh })).user.mustChangePassword).toBe(true);
    expect((await auditEntriesFor(db, "user", person.id)).map((a) => a.action)).toContain("user.password_reset");
  });

  it("test_s001_rf30_no_se_puede_desactivar_ni_degradar_al_unico_dueno_activo", async () => {
    const { ctx, owner } = await world();
    await expect(deactivatePerson(ctx, owner, owner.id)).rejects.toMatchObject({ code: "last_owner", status: 409 });
    await expect(updatePerson(ctx, owner, owner.id, { role: "admin" })).rejects.toMatchObject({ code: "last_owner" });
    const { person: second } = await createPerson(ctx, owner, { name: "Socio", email: "socio@mando.test", role: "owner", branchIds: [] });
    expect(second.role).toBe("owner");
    expect((await updatePerson(ctx, owner, owner.id, { role: "admin" })).role).toBe("admin");
    await expect(deactivatePerson(ctx, owner, second.id)).rejects.toMatchObject({ code: "last_owner" });
  });

  it("test_s001_rf31_un_administrador_no_puede_gestionar_personas", async () => {
    const { ctx, owner } = await world();
    const { person } = await createPerson(ctx, owner, { name: "Admin", email: "admin@mando.test", role: "admin", branchIds: [] });
    const admin = { ...(await listPeople(ctx, owner)).find((p) => p.id === person.id)!, lastBranchId: null, createdAt: new Date() };
    for (const call of [
      () => listPeople(ctx, admin),
      () => createPerson(ctx, admin, { name: "X", email: "x@mando.test", role: "admin", branchIds: [] }),
      () => updatePerson(ctx, admin, owner.id, { name: "X" }),
      () => deactivatePerson(ctx, admin, owner.id),
      () => reactivatePerson(ctx, admin, owner.id),
      () => resetPersonPassword(ctx, admin, owner.id),
    ])
      await expect(call()).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });
});
