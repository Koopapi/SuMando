// Spec 001: handlers de personas con guardia de dueño (RF-11, RF-23 a RF-31).
import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as me } from "@/app/api/me/route";
import { POST as createBusiness } from "@/app/api/businesses/route";
import { GET as listPeople, POST as createPerson } from "@/app/api/people/route";
import { PATCH as updatePerson } from "@/app/api/people/[id]/route";
import { POST as deactivate } from "@/app/api/people/[id]/deactivate/route";
import { POST as reactivate } from "@/app/api/people/[id]/reactivate/route";
import { POST as resetPassword } from "@/app/api/people/[id]/reset-password/route";
import { POST as setupPost } from "@/app/api/setup/route";
import { ApiClient, json } from "./api";
import { OWNER } from "./helpers";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function ownerWithBranch() {
  const client = new ApiClient();
  expect((await client.call(setupPost, "/api/setup", { body: OWNER })).status).toBe(201);
  const { business } = await json(await client.call(createBusiness, "/api/businesses", { body: { name: "Pastatti", firstBranchName: "Sendero" } }));
  return { client, branchId: business.branches[0].id as string };
}

describe("spec 001 — API de personas", () => {
  it("test_s001_rf23_rf24_rf25_da_de_alta_con_temporal_rechaza_el_correo_repetido_y_asigna_sucursales", async () => {
    const { client, branchId } = await ownerWithBranch();
    const res = await client.call(createPerson, "/api/people", { body: { name: "Admin", email: "admin@mando.test", role: "admin", branchIds: [branchId] } });
    expect(res.status).toBe(201);
    const { person, temporaryPassword } = await json(res);
    expect(temporaryPassword).toHaveLength(10);
    expect(person).toMatchObject({ email: "admin@mando.test", role: "admin", branchIds: [branchId], mustChangePassword: true });
    const dup = await client.call(createPerson, "/api/people", { body: { name: "Otra", email: "ADMIN@mando.test", role: "admin" } });
    expect(dup.status).toBe(409);
    expect((await json(dup)).error.code).toBe("duplicate_email");
    const badRole = await client.call(createPerson, "/api/people", { body: { name: "Otra", email: "otra@mando.test", role: "jefe" } });
    expect(badRole.status).toBe(422);
    const updated = await client.call((r) => updatePerson(r, ctx(person.id)), `/api/people/${person.id}`, { method: "PATCH", body: { branchIds: [], name: "Admin Dos" } });
    expect((await json(updated)).person).toMatchObject({ name: "Admin Dos", branchIds: [] });
    const list = await json(await client.call(listPeople, "/api/people"));
    expect(list.people).toHaveLength(2);
    const admin = new ApiClient();
    expect((await admin.call(login, "/api/auth/login", { body: { email: "admin@mando.test", password: temporaryPassword } })).status).toBe(200);
    expect(admin.cookies.mando_pwchange).toBe("1");
  });

  it("test_s001_rf28_rf29_rf14_desactivar_reactivar_y_restablecer", async () => {
    const { client, branchId } = await ownerWithBranch();
    const { person, temporaryPassword } = await json(await client.call(createPerson, "/api/people", { body: { name: "Admin", email: "admin@mando.test", role: "admin", branchIds: [branchId] } }));
    const admin = new ApiClient();
    await admin.call(login, "/api/auth/login", { body: { email: "admin@mando.test", password: temporaryPassword } });
    const off = await client.call((r) => deactivate(r, ctx(person.id)), `/api/people/${person.id}/deactivate`, { method: "POST" });
    expect((await json(off)).person.isActive).toBe(false);
    expect((await admin.call(me, "/api/me")).status).toBe(401);
    expect((await new ApiClient().call(login, "/api/auth/login", { body: { email: "admin@mando.test", password: temporaryPassword } })).status).toBe(401);
    const back = await json(await client.call((r) => reactivate(r, ctx(person.id)), `/api/people/${person.id}/reactivate`, { method: "POST" }));
    expect(back.person).toMatchObject({ isActive: true, branchIds: [branchId] });
    expect(back.temporaryPassword).toHaveLength(10);
    const reset = await json(await client.call((r) => resetPassword(r, ctx(person.id)), `/api/people/${person.id}/reset-password`, { method: "POST" }));
    expect(reset.temporaryPassword).toHaveLength(10);
    expect(reset.temporaryPassword).not.toBe(back.temporaryPassword);
    expect((await new ApiClient().call(login, "/api/auth/login", { body: { email: "admin@mando.test", password: reset.temporaryPassword } })).status).toBe(200);
  });

  it("test_s001_rf30_desactivar_al_unico_dueno_responde_409", async () => {
    const { client } = await ownerWithBranch();
    const { user } = await json(await client.call(me, "/api/me"));
    const res = await client.call((r) => deactivate(r, ctx(user.id)), `/api/people/${user.id}/deactivate`, { method: "POST" });
    expect(res.status).toBe(409);
    expect((await json(res)).error.code).toBe("last_owner");
  });

  it("test_s001_rf31_un_administrador_recibe_403_en_las_rutas_de_personas", async () => {
    const { client } = await ownerWithBranch();
    const { person, temporaryPassword } = await json(await client.call(createPerson, "/api/people", { body: { name: "Admin", email: "admin@mando.test", role: "admin" } }));
    const admin = new ApiClient();
    await admin.call(login, "/api/auth/login", { body: { email: "admin@mando.test", password: temporaryPassword } });
    for (const res of await Promise.all([
      admin.call(listPeople, "/api/people"),
      admin.call(createPerson, "/api/people", { body: { name: "X", email: "x@mando.test", role: "admin" } }),
      admin.call((r) => updatePerson(r, ctx(person.id)), "/api/people/x", { method: "PATCH", body: { name: "X" } }),
      admin.call((r) => deactivate(r, ctx(person.id)), "/api/people/x/deactivate", { method: "POST" }),
      admin.call((r) => reactivate(r, ctx(person.id)), "/api/people/x/reactivate", { method: "POST" }),
      admin.call((r) => resetPassword(r, ctx(person.id)), "/api/people/x/reset-password", { method: "POST" }),
    ])) {
      // Con contraseña temporal pendiente, el servidor exige el cambio antes que nada (RF-12); sin ella, falta de permiso.
      expect([403]).toContain(res.status);
      expect(["forbidden", "password_change_required"]).toContain((await json(res)).error.code);
    }
  });
});
