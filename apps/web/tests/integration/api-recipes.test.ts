// Spec 004: handlers del recetario con sesión y sucursal activa (RF-1 a RF-6) y su contrato.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as calcBase } from "@/app/api/calculations/[id]/base/route";
import { GET as getCalc } from "@/app/api/calculations/[id]/route";
import { POST as preview } from "@/app/api/calculations/preview/route";
import { GET as listCalcs, POST as saveCalc } from "@/app/api/calculations/route";
import { POST as productPost } from "@/app/api/products/route";
import { POST as templateAction } from "@/app/api/recipe-templates/[id]/[action]/route";
import { GET as templateGet, PATCH as templatePatch } from "@/app/api/recipe-templates/[id]/route";
import { GET as listTemplates, POST as saveTemplate } from "@/app/api/recipe-templates/route";
import { POST as recipeAction } from "@/app/api/recipes/[id]/[action]/route";
import { GET as getRecipe, PUT as putRecipe } from "@/app/api/recipes/[id]/route";
import { POST as importRoute } from "@/app/api/recipes/import/route";
import { GET as listRecipes, POST as createRecipe } from "@/app/api/recipes/route";
import { PUT as selectBranch } from "@/app/api/session/branch/route";
import { POST as setupPost } from "@/app/api/setup/route";
import { appCtx } from "@/server/app-context";
import { addBranch, createBusiness } from "@/server/services/businesses";
import { publicUser } from "@/server/services/users-public";
import { xlsx } from "../support/xlsx";
import { ApiClient, json } from "./api";
import { OWNER } from "./helpers";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const act = (id: string, action: string) => ({ params: Promise.resolve({ id, action }) });

async function world() {
  const owner = new ApiClient();
  expect((await owner.call(setupPost, "/api/setup", { body: OWNER })).status).toBe(201);
  const app = appCtx();
  const actor = publicUser((await app.store.users.findByEmail(OWNER.email))!);
  const pastatti = await createBusiness(app, actor, { name: "Pastatti", firstBranchName: "Sendero", color: "violeta" });
  const pirrus = await createBusiness(app, actor, { name: "Pirrus", firstBranchName: "Centro", color: "rojo" });
  const pirrusNorte = await addBranch(app, actor, pirrus.business.id, { name: "Norte" });
  const at = async (branchId: string) => {
    const client = new ApiClient();
    await client.call(login, "/api/auth/login", { body: { email: OWNER.email, password: OWNER.password } });
    expect((await client.call(selectBranch, "/api/session/branch", { method: "PUT", body: { branchId } })).status).toBe(200);
    return client;
  };
  const inPirrus = await at(pirrus.branch.id);
  const { product } = await json(await inPirrus.call(productPost, "/api/products", { body: { name: "Pepino", baseUnit: "g" } }));
  return { owner, inPastatti: await at(pastatti.branch.id), inPirrus, inNorte: await at(pirrusNorte.id), pepino: product.id as string };
}

describe("spec 004 — API del recetario", () => {
  it("test_s004_rf3_la_api_lista_solo_las_recetas_del_negocio_activo", async () => {
    const { inPirrus, inPastatti, pepino } = await world();
    const res = await inPirrus.call(createRecipe, "/api/recipes", { body: { name: "Negro", ingredients: [{ productId: pepino, quantity: "60" }] } });
    expect(res.status).toBe(201);
    expect((await json(await inPirrus.call(listRecipes, "/api/recipes"))).recipes.map((r: { name: string }) => r.name)).toEqual(["Negro"]);
    expect((await json(await inPastatti.call(listRecipes, "/api/recipes"))).recipes).toEqual([]);
  });

  it("test_s004_rf6_por_direccion_directa_lo_de_otro_negocio_o_sucursal_responde_404", async () => {
    const { inPirrus, inPastatti, inNorte, pepino } = await world();
    const { recipe } = await json(await inPirrus.call(createRecipe, "/api/recipes", { body: { name: "Negro", ingredients: [{ productId: pepino, quantity: "60" }] } }));
    expect((await inPastatti.call((r) => getRecipe(r, ctx(recipe.id)), "/x")).status).toBe(404);
    expect((await inPastatti.call((r) => putRecipe(r, ctx(recipe.id)), "/x", { method: "PUT", body: { name: "X", ingredients: [{ productId: pepino, quantity: "1" }] } })).status).toBe(404);
    expect((await inPastatti.call((r) => recipeAction(r, act(recipe.id, "archive")), "/x", { body: {} })).status).toBe(404);
    const { calculation } = await json(await inPirrus.call(saveCalc, "/api/calculations", { body: { items: [{ recipeId: recipe.id, full: 2, half: 0 }] } }));
    // Norte es del mismo negocio, pero el cálculo es de la sucursal Centro (RF-2, RF-5).
    expect((await inNorte.call((r) => getCalc(r, ctx(calculation.id)), "/x")).status).toBe(404);
    expect((await inNorte.call((r) => calcBase(r, ctx(calculation.id)), "/x")).status).toBe(404);
    expect((await json(await inNorte.call(listCalcs, "/api/calculations"))).calculations).toEqual([]);
    const { template } = await json(await inPirrus.call(saveTemplate, "/api/recipe-templates", { body: { name: "Diario", items: [{ recipeId: recipe.id, full: 1, half: 0 }] } }));
    expect((await inNorte.call((r) => templateGet(r, ctx(template.id)), "/x")).status).toBe(404);
    expect((await inNorte.call((r) => templatePatch(r, ctx(template.id)), "/x", { method: "PATCH", body: { name: "Otro" } })).status).toBe(404);
    expect((await inNorte.call((r) => templateAction(r, act(template.id, "archive")), "/x", { body: {} })).status).toBe(404);
    // Pero Norte sí ve las recetas del negocio (RF-1).
    expect((await json(await inNorte.call(listRecipes, "/api/recipes"))).recipes).toHaveLength(1);
  });

  it("test_s004_rf5_sin_sesion_no_hay_recetario", async () => {
    const anon = new ApiClient();
    expect((await anon.call(listRecipes, "/api/recipes")).status).toBe(401);
    expect((await anon.call(preview, "/api/calculations/preview", { body: { items: [] } })).status).toBe(401);
  });

  it("test_s004_rf31_ningun_recurso_del_recetario_se_borra_ni_un_calculo_se_modifica", () => {
    const root = path.resolve(import.meta.dirname, "../../src/app/api");
    const routes: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = path.join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (f === "route.ts") routes.push(p);
      }
    };
    for (const d of ["recipes", "calculations", "recipe-templates"]) walk(path.join(root, d));
    expect(routes.length).toBeGreaterThanOrEqual(10);
    for (const r of routes) expect(readFileSync(r, "utf8")).not.toMatch(/export const DELETE/);
    for (const r of routes.filter((x) => x.includes(`${path.sep}calculations${path.sep}`))) expect(readFileSync(r, "utf8")).not.toMatch(/export const (PUT|PATCH)/);
  });

  it("test_s004_contrato_flujo_por_api_con_errores_en_espanol", async () => {
    const { inPirrus, pepino } = await world();
    const empty = await inPirrus.call(createRecipe, "/api/recipes", { body: { name: "Negro", ingredients: [] } });
    expect(empty.status).toBe(422);
    expect((await json(empty)).error.message).toMatch(/al menos un ingrediente/);
    const { recipe } = await json(await inPirrus.call(createRecipe, "/api/recipes", { body: { name: "Negro", halfPercent: 60, ingredients: [{ productId: pepino, quantity: "60", note: "1 puño" }] } }));
    expect(recipe).toMatchObject({ name: "Negro", halfPercent: 60, ingredients: [{ productName: "Pepino", quantity: "60", note: "1 puño" }] });
    const badHalf = await inPirrus.call((r) => putRecipe(r, ctx(recipe.id)), "/x", { method: "PUT", body: { name: "Negro", halfPercent: 0, ingredients: [{ productId: pepino, quantity: "60" }] } });
    expect((await json(badHalf)).error.message).toMatch(/1 a 100/);
    const lines = await json(await inPirrus.call(preview, "/api/calculations/preview", { body: { items: [{ recipeId: recipe.id, full: "10", half: "5" }] } }));
    expect(lines.lines).toEqual([{ productId: pepino, name: "Pepino", baseUnit: "g", total: "780", purchase: null, archived: false }]);
    const badPieces = await inPirrus.call(preview, "/api/calculations/preview", { body: { items: [{ recipeId: recipe.id, full: "-1", half: 0 }] } });
    expect((await json(badPieces)).error.message).toMatch(/0 a 9,999/);
    const zero = await inPirrus.call(saveCalc, "/api/calculations", { body: { items: [{ recipeId: recipe.id, full: 0, half: 0 }] } });
    expect((await json(zero)).error.message).toMatch(/al menos un platillo/);
    const saved = await inPirrus.call(saveCalc, "/api/calculations", { body: { items: [{ recipeId: recipe.id, full: 10, half: 5 }] } });
    expect(saved.status).toBe(201);
    const { calculation } = await json(saved);
    expect((await json(await inPirrus.call((r) => getCalc(r, ctx(calculation.id)), "/x"))).calculation.lines[0].total).toBe("780");
    expect((await json(await inPirrus.call((r) => calcBase(r, ctx(calculation.id)), "/x")))).toEqual({ items: [{ recipeId: recipe.id, full: 10, half: 5 }], dropped: [] });
    const body = { name: "Fin de semana", items: [{ recipeId: recipe.id, full: 40, half: 0 }] };
    expect((await inPirrus.call(saveTemplate, "/api/recipe-templates", { body })).status).toBe(201);
    const clash = await inPirrus.call(saveTemplate, "/api/recipe-templates", { body });
    expect(clash.status).toBe(409);
    expect((await json(clash)).error).toMatchObject({ code: "template_exists" });
    expect((await inPirrus.call(saveTemplate, "/api/recipe-templates", { body: { ...body, replace: true } })).status).toBe(201);
    expect((await json(await inPirrus.call(listTemplates, "/api/recipe-templates"))).templates).toHaveLength(1);
    const archived = await inPirrus.call((r) => recipeAction(r, act(recipe.id, "archive")), "/x", { body: {} });
    expect((await json(archived)).recipe.archived).toBe(true);
    expect((await inPirrus.call((r) => recipeAction(r, act(recipe.id, "delete")), "/x", { body: {} })).status).toBe(404);
  });

  it("test_s004_rf42_rf47_rf48_importar_por_formulario", async () => {
    const { inPirrus } = await world();
    const header = ["Ingredientes", "Cantidad bruta", "Unidad", "Nota"];
    const book = xlsx([
      { name: "A", rows: [["Ensalada"], header, ["pepino", 100, "Gramos"]] },
      { name: "B", rows: [["Limonada"], header, ["limones", 140, "Gramos"]] },
    ]);
    const form = (confirm: boolean, data: Buffer | string = book) => {
      const f = new FormData();
      f.set("file", new Blob([typeof data === "string" ? data : new Uint8Array(data)]), "recetario.xlsx");
      if (confirm) f.set("confirm", "1");
      return f;
    };
    const review = await json(await inPirrus.form(importRoute, "/api/recipes/import", form(false)));
    expect(review.dishes.map((d: { name: string; status: string }) => [d.name, d.status])).toEqual([["Ensalada", "ready"], ["Limonada", "problems"]]);
    expect((await json(await inPirrus.call(listRecipes, "/api/recipes"))).recipes).toEqual([]);
    expect(await json(await inPirrus.form(importRoute, "/api/recipes/import", form(true)))).toEqual({ imported: 1, skipped: 1 });
    const bad = await inPirrus.form(importRoute, "/api/recipes/import", form(false, "hola"));
    expect(bad.status).toBe(422);
    expect((await json(bad)).error.message).toMatch(/Excel/);
    const big = await inPirrus.form(importRoute, "/api/recipes/import", form(false, Buffer.alloc(2 * 1024 * 1024 + 1)));
    expect(big.status).toBe(413);
    const noFile = await inPirrus.form(importRoute, "/api/recipes/import", new FormData());
    expect(noFile.status).toBe(422);
  });
});
