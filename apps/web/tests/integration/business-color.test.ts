// Spec 002, RF-8 a RF-11 y RF-15: color de cada negocio en el servicio y en la API.
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as listRoute, POST as createRoute } from "@/app/api/businesses/route";
import { PATCH as updateRoute } from "@/app/api/businesses/[id]/route";
import { POST as setupPost } from "@/app/api/setup/route";
import { appCtx } from "@/server/app-context";
import { auditEntriesFor } from "@/server/adapters/drizzle/store";
import { createBusiness, listBusinesses, suggestedColor, updateBusiness, archiveBusiness } from "@/server/services/businesses";
import { createFirstOwner } from "@/server/services/setup";
import { publicUser } from "@/server/services/users-public";
import { ApiClient, json } from "./api";
import { makeCtx, OWNER } from "./helpers";

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("spec 002 — color de negocio (servicio)", () => {
  it("test_s002_rf8_el_negocio_se_crea_con_el_color_elegido", async () => {
    const ctx = makeCtx();
    const owner = (await createFirstOwner(ctx, OWNER)).user;
    const { business } = await createBusiness(ctx, owner, { name: "Pastatti", firstBranchName: "Sendero", color: "turquesa" });
    expect(business.color).toBe("turquesa");
    const [listed] = await listBusinesses(ctx, owner);
    expect(listed.color).toBe("turquesa");
  });

  it("test_s002_rf8_sin_color_o_con_uno_fuera_de_la_paleta_se_rechaza", async () => {
    const ctx = makeCtx();
    const owner = (await createFirstOwner(ctx, OWNER)).user;
    for (const color of [undefined, "", "morado", "#6D28D9", 3]) {
      await expect(createBusiness(ctx, owner, { name: "Pirrus", firstBranchName: "Centro", color })).rejects.toMatchObject({ code: "invalid_color", status: 422 });
    }
    expect(await listBusinesses(ctx, owner)).toEqual([]);
  });

  it("test_s002_rf10_el_color_sugerido_es_el_primero_libre_contando_archivados", async () => {
    const ctx = makeCtx();
    const owner = (await createFirstOwner(ctx, OWNER)).user;
    expect(await suggestedColor(ctx, owner)).toBe("violeta");
    const { business } = await createBusiness(ctx, owner, { name: "Pastatti", firstBranchName: "Sendero", color: "violeta" });
    await createBusiness(ctx, owner, { name: "Pirrus", firstBranchName: "Centro", color: "rojo" });
    await archiveBusiness(ctx, owner, business.id);
    expect(await suggestedColor(ctx, owner)).toBe("naranja");
  });

  it("test_s002_rf9_rf15_cambiar_el_color_queda_en_el_registro_con_el_anterior", async () => {
    const ctx = makeCtx();
    const owner = (await createFirstOwner(ctx, OWNER)).user;
    const { business } = await createBusiness(ctx, owner, { name: "Pastatti", firstBranchName: "Sendero", color: "violeta" });
    ctx.clock.advance(60_000);
    const after = await updateBusiness(ctx, owner, business.id, { color: "turquesa" });
    expect(after.color).toBe("turquesa");
    const entries = (await auditEntriesFor(db, "business", business.id)).filter((e) => e.action === "business.color_changed");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ actorId: owner.id, before: { color: "violeta" }, after: { color: "turquesa" } });
    expect(entries[0].createdAt.getTime()).toBe(ctx.clock.now().getTime());
  });

  it("test_s002_rf9_mismo_color_o_nada_que_cambiar", async () => {
    const ctx = makeCtx();
    const owner = (await createFirstOwner(ctx, OWNER)).user;
    const { business } = await createBusiness(ctx, owner, { name: "Pastatti", firstBranchName: "Sendero", color: "violeta" });
    await expect(updateBusiness(ctx, owner, business.id, {})).rejects.toMatchObject({ code: "nothing_to_update" });
    await expect(updateBusiness(ctx, owner, business.id, { color: "morado" })).rejects.toMatchObject({ code: "invalid_color" });
    await updateBusiness(ctx, owner, business.id, { color: "violeta" });
    expect((await auditEntriesFor(db, "business", business.id)).filter((e) => e.action === "business.color_changed")).toHaveLength(0);
  });

  it("test_s002_rf11_un_administrador_no_puede_cambiar_el_color", async () => {
    const ctx = makeCtx();
    const owner = (await createFirstOwner(ctx, OWNER)).user;
    const { business } = await createBusiness(ctx, owner, { name: "Pastatti", firstBranchName: "Sendero", color: "violeta" });
    const admin = publicUser(await ctx.store.users.insert({ name: "Admin", email: "admin@mando.test", passwordHash: "x", role: "admin", createdAt: ctx.clock.now() }));
    await expect(updateBusiness(ctx, admin, business.id, { color: "rojo" })).rejects.toMatchObject({ code: "forbidden", status: 403 });
    expect((await listBusinesses(ctx, owner))[0].color).toBe("violeta");
  });
});

describe("spec 002 — color de negocio (API)", () => {
  async function ownerClient() {
    const client = new ApiClient();
    expect((await client.call(setupPost, "/api/setup", { body: OWNER })).status).toBe(201);
    return client;
  }

  it("test_s002_rf8_la_api_crea_y_lista_el_negocio_con_su_color", async () => {
    const client = await ownerClient();
    const res = await client.call(createRoute, "/api/businesses", { body: { name: "Pirrus", firstBranchName: "Centro", color: "violeta" } });
    expect(res.status).toBe(201);
    expect((await json(res)).business).toMatchObject({ name: "Pirrus", color: "violeta" });
    const list = await json(await client.call(listRoute, "/api/businesses"));
    expect(list.businesses[0].color).toBe("violeta");
    expect(list.suggestedColor).toBe("rojo");
    const bad = await client.call(createRoute, "/api/businesses", { body: { name: "Otro", firstBranchName: "Centro" } });
    expect(bad.status).toBe(422);
    expect((await json(bad)).error.code).toBe("invalid_color");
  });

  it("test_s002_rf9_rf11_la_api_cambia_el_color_solo_al_dueno", async () => {
    const client = await ownerClient();
    const { business } = await json(await client.call(createRoute, "/api/businesses", { body: { name: "Pirrus", firstBranchName: "Centro", color: "violeta" } }));
    const res = await client.call((r) => updateRoute(r, params(business.id)), `/api/businesses/${business.id}`, { method: "PATCH", body: { color: "azul" } });
    expect(res.status).toBe(200);
    expect((await json(res)).business.color).toBe("azul");
    const renamed = await client.call((r) => updateRoute(r, params(business.id)), `/api/businesses/${business.id}`, { method: "PATCH", body: { name: "Pirrus Mariscos" } });
    expect((await json(renamed)).business).toMatchObject({ name: "Pirrus Mariscos", color: "azul" });

    const app = appCtx();
    await app.store.users.insert({ name: "Admin", email: "admin@mando.test", passwordHash: await app.ports.hasher.hash("admin-123456"), role: "admin", createdAt: app.ports.clock.now() });
    const admin = new ApiClient();
    expect((await admin.call(login, "/api/auth/login", { body: { email: "admin@mando.test", password: "admin-123456" } })).status).toBe(200);
    const denied = await admin.call((r) => updateRoute(r, params(business.id)), `/api/businesses/${business.id}`, { method: "PATCH", body: { color: "rojo" } });
    expect(denied.status).toBe(403);
  });
});
