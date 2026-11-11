// Spec 001: handlers de negocios y sucursales con guardia de dueño (RF-17 a RF-22, RF-31).
import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { PATCH as renameBranch } from "@/app/api/branches/[id]/route";
import { POST as archiveBranch } from "@/app/api/branches/[id]/archive/route";
import { POST as reactivateBranch } from "@/app/api/branches/[id]/reactivate/route";
import { GET as listBusinesses, POST as createBusiness } from "@/app/api/businesses/route";
import { PATCH as renameBusiness } from "@/app/api/businesses/[id]/route";
import { POST as archiveBusiness } from "@/app/api/businesses/[id]/archive/route";
import { POST as addBranch } from "@/app/api/businesses/[id]/branches/route";
import { POST as reactivateBusiness } from "@/app/api/businesses/[id]/reactivate/route";
import { POST as setupPost } from "@/app/api/setup/route";
import { appCtx } from "@/server/app-context";
import { ApiClient, json } from "./api";
import { OWNER } from "./helpers";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function ownerClient() {
  const client = new ApiClient();
  expect((await client.call(setupPost, "/api/setup", { body: OWNER })).status).toBe(201);
  return client;
}

async function adminClient() {
  const app = appCtx();
  await app.store.users.insert({ name: "Admin", email: "admin@mando.test", passwordHash: await app.ports.hasher.hash("admin-123456"), role: "admin", createdAt: app.ports.clock.now() });
  const client = new ApiClient();
  expect((await client.call(login, "/api/auth/login", { body: { email: "admin@mando.test", password: "admin-123456" } })).status).toBe(200);
  return client;
}

describe("spec 001 — API de negocios", () => {
  it("test_s001_rf17_rf18_rf19_crea_negocio_anade_sucursal_renombra_y_rechaza_duplicados", async () => {
    const client = await ownerClient();
    const created = await client.call(createBusiness, "/api/businesses", { body: { name: "Pastatti", firstBranchName: "Sendero" } });
    expect(created.status).toBe(201);
    const { business } = await json(created);
    expect(business).toMatchObject({ name: "Pastatti", archived: false, branches: [{ name: "Sendero", archived: false }] });
    const dup = await client.call(createBusiness, "/api/businesses", { body: { name: " pastatti", firstBranchName: "Otra" } });
    expect(dup.status).toBe(409);
    expect((await json(dup)).error.code).toBe("duplicate_name");
    const branch = await client.call((r) => addBranch(r, ctx(business.id)), `/api/businesses/${business.id}/branches`, { body: { name: "Centro" } });
    expect(branch.status).toBe(201);
    const renamed = await client.call((r) => renameBusiness(r, ctx(business.id)), `/api/businesses/${business.id}`, { method: "PATCH", body: { name: "Pastatti MX" } });
    expect((await json(renamed)).business.name).toBe("Pastatti MX");
    const { branch: centro } = await json(branch);
    const renamedBranch = await client.call((r) => renameBranch(r, ctx(centro.id)), `/api/branches/${centro.id}`, { method: "PATCH", body: { name: "Centro Sur" } });
    expect((await json(renamedBranch)).branch.name).toBe("Centro Sur");
    const list = await json(await client.call(listBusinesses, "/api/businesses"));
    expect(list.businesses[0].branches.map((b: { name: string }) => b.name)).toEqual(["Centro Sur", "Sendero"]);
  });

  it("test_s001_rf20_un_nombre_vacio_responde_422_con_el_limite", async () => {
    const client = await ownerClient();
    const res = await client.call(createBusiness, "/api/businesses", { body: { name: " ", firstBranchName: "Centro" } });
    expect(res.status).toBe(422);
    expect((await json(res)).error).toMatchObject({ code: "name_invalid", params: { max: 60 } });
  });

  it("test_s001_rf21_rf22_archiva_y_reactiva_negocios_y_sucursales", async () => {
    const client = await ownerClient();
    const { business } = await json(await client.call(createBusiness, "/api/businesses", { body: { name: "Pirrus", firstBranchName: "Centro" } }));
    const branchId = business.branches[0].id;
    expect((await json(await client.call((r) => archiveBranch(r, ctx(branchId)), `/api/branches/${branchId}/archive`, { method: "POST" }))).branch.archived).toBe(true);
    expect((await json(await client.call((r) => reactivateBranch(r, ctx(branchId)), `/api/branches/${branchId}/reactivate`, { method: "POST" }))).branch.archived).toBe(false);
    expect((await json(await client.call((r) => archiveBusiness(r, ctx(business.id)), `/api/businesses/${business.id}/archive`, { method: "POST" }))).business.archived).toBe(true);
    const list = await json(await client.call(listBusinesses, "/api/businesses"));
    expect(list.businesses[0]).toMatchObject({ archived: true, branches: [{ archived: true }] });
    expect((await json(await client.call((r) => reactivateBusiness(r, ctx(business.id)), `/api/businesses/${business.id}/reactivate`, { method: "POST" }))).business.archived).toBe(false);
    const missing = await client.call((r) => archiveBusiness(r, ctx("00000000-0000-4000-8000-000000000000")), "/api/businesses/x/archive", { method: "POST" });
    expect(missing.status).toBe(404);
  });

  it("test_s001_rf31_un_administrador_recibe_403_en_todas_las_rutas_aunque_llame_directo", async () => {
    const owner = await ownerClient();
    const { business } = await json(await owner.call(createBusiness, "/api/businesses", { body: { name: "Pastatti", firstBranchName: "Sendero" } }));
    const branchId = business.branches[0].id;
    const admin = await adminClient();
    const attempts: Promise<Response>[] = [
      admin.call(listBusinesses, "/api/businesses"),
      admin.call(createBusiness, "/api/businesses", { body: { name: "Otro", firstBranchName: "Centro" } }),
      admin.call((r) => renameBusiness(r, ctx(business.id)), "/api/businesses/x", { method: "PATCH", body: { name: "X" } }),
      admin.call((r) => archiveBusiness(r, ctx(business.id)), "/api/businesses/x/archive", { method: "POST" }),
      admin.call((r) => reactivateBusiness(r, ctx(business.id)), "/api/businesses/x/reactivate", { method: "POST" }),
      admin.call((r) => addBranch(r, ctx(business.id)), "/api/businesses/x/branches", { body: { name: "Centro" } }),
      admin.call((r) => renameBranch(r, ctx(branchId)), "/api/branches/x", { method: "PATCH", body: { name: "X" } }),
      admin.call((r) => archiveBranch(r, ctx(branchId)), "/api/branches/x/archive", { method: "POST" }),
      admin.call((r) => reactivateBranch(r, ctx(branchId)), "/api/branches/x/reactivate", { method: "POST" }),
    ];
    for (const res of await Promise.all(attempts)) {
      expect(res.status).toBe(403);
      expect((await json(res)).error.code).toBe("forbidden");
    }
    expect((await new ApiClient().call(listBusinesses, "/api/businesses")).status).toBe(401);
  });
});
