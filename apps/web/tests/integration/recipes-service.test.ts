// Spec 004: servicios del recetario contra la BD de pruebas (recetas, cálculo, historial, plantillas, importación).
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { auditEntriesFor } from "@/server/adapters/drizzle/store";
import { setArchived } from "@/server/services/catalog/archive";
import { addPresentation, updatePresentation } from "@/server/services/catalog/products";
import { calculationBase, calculationBoard, calculationDetail, listCalculations, previewSupplies, saveCalculation } from "@/server/services/recipes/calculations";
import { confirmImport, reviewImport } from "@/server/services/recipes/import";
import { createRecipe, listRecipes, recipeDetail, recipesUsingProduct, setRecipeArchived, updateRecipe } from "@/server/services/recipes/recipes";
import { listTemplates, renameTemplate, saveTemplate, setTemplateArchived, templateStart } from "@/server/services/recipes/templates";
import { xlsx } from "../support/xlsx";
import { recipesWorld } from "./recipes-fixture";

const history = async (type: string, id: string) => (await auditEntriesFor(db, type, id)).reverse();
const code = (p: Promise<unknown>) => p.then(() => "ok", (e: { code?: string }) => e.code ?? String(e));
type World = Awaited<ReturnType<typeof recipesWorld>>;

const negro = (w: World, extra: Partial<Parameters<typeof createRecipe>[2]> = {}) =>
  createRecipe(w.ctx, w.ownerPirrus, {
    name: "Negro",
    preparation: "1.- Colocar el pepino",
    ingredients: [
      { productId: w.pepino.id, quantity: "60", note: "1 puño lunas" },
      { productId: w.camaron.id, quantity: "210" },
      { productId: w.salsa.id, quantity: "100" },
    ],
    ...extra,
  });
const verde = (w: World) =>
  createRecipe(w.ctx, w.ownerPirrus, { name: "Verde", halfPercent: 60, ingredients: [{ productId: w.camaron.id, quantity: "210" }, { productId: w.limon.id, quantity: "140" }] });

describe("spec 004 — recetas", () => {
  it("test_s004_rf1_rf3_las_recetas_son_de_un_solo_negocio", async () => {
    const w = await recipesWorld();
    await negro(w);
    await createRecipe(w.ctx, w.ownerSendero, { name: "Pan", ingredients: [{ productId: w.harina.id, quantity: "500" }] });
    expect((await listRecipes(w.ctx, w.ownerPirrus)).map((r) => r.name)).toEqual(["Negro"]);
    expect((await listRecipes(w.ctx, w.adminSendero)).map((r) => r.name)).toEqual(["Pan"]);
  });

  it("test_s004_rf4_un_administrador_del_negocio_edita_recetas", async () => {
    const w = await recipesWorld();
    const r = await createRecipe(w.ctx, w.adminPirrus, { name: "Verde", ingredients: [{ productId: w.camaron.id, quantity: "210" }] });
    const after = await updateRecipe(w.ctx, w.adminPirrus, r.id, { name: "Verde", halfPercent: 70, ingredients: [{ productId: w.camaron.id, quantity: "200" }] });
    expect(after.halfPercent).toBe(70);
    expect(after.ingredients[0].quantity).toBe("200");
  });

  it("test_s004_rf6_una_receta_de_otro_negocio_no_existe_para_quien_pregunta", async () => {
    const w = await recipesWorld();
    const r = await negro(w);
    expect(await code(recipeDetail(w.ctx, w.adminSendero, r.id))).toBe("not_found");
    expect(await code(updateRecipe(w.ctx, w.adminSendero, r.id, { name: "X", ingredients: [{ productId: w.harina.id, quantity: "1" }] }))).toBe("not_found");
    expect(await code(setRecipeArchived(w.ctx, w.adminSendero, r.id, true))).toBe("not_found");
  });

  it("test_s004_rf7_rf8_alta_con_preparacion_ingredientes_y_notas", async () => {
    const w = await recipesWorld();
    const r = await negro(w);
    expect(r).toMatchObject({ name: "Negro", preparation: "1.- Colocar el pepino", halfPercent: 50, archived: false });
    expect(r.ingredients.map((i) => [i.productName, i.quantity, i.note])).toEqual([
      ["Pepino", "60", "1 puño lunas"],
      ["Camarón crudo (Aguachile)", "210", null],
      ["Salsa negra Especial", "100", null],
    ]);
  });

  it("test_s004_rf8_un_producto_de_otro_negocio_o_archivado_no_se_acepta", async () => {
    const w = await recipesWorld();
    expect(await code(createRecipe(w.ctx, w.ownerPirrus, { name: "X", ingredients: [{ productId: w.harina.id, quantity: "1" }] }))).toBe("not_found");
    await setArchived(w.ctx, w.ownerPirrus, "products", w.pepino.id, true);
    expect(await code(createRecipe(w.ctx, w.ownerPirrus, { name: "X", ingredients: [{ productId: w.pepino.id, quantity: "1" }] }))).toBe("product_archived");
  });

  it("test_s004_rf9_la_cantidad_se_captura_en_cualquier_presentacion_y_se_guarda_en_base", async () => {
    const w = await recipesWorld();
    const r = await createRecipe(w.ctx, w.ownerPirrus, { name: "Charola", ingredients: [{ productId: w.camaron.id, quantity: "0.5", presentationId: w.camaron.presentationId }] });
    expect(r.ingredients[0]).toMatchObject({ quantity: "1000", baseUnit: "g" });
    const other = await addPresentation(w.ctx, w.ownerPirrus, w.pepino.id, { name: "Kilo", factor: "1000" });
    expect(await code(createRecipe(w.ctx, w.ownerPirrus, { name: "Y", ingredients: [{ productId: w.camaron.id, quantity: "1", presentationId: other.id }] }))).toBe("validation");
  });

  it("test_s004_rf10_rf11_rf13_cantidades_repetidos_y_receta_vacia", async () => {
    const w = await recipesWorld();
    expect(await code(createRecipe(w.ctx, w.ownerPirrus, { name: "X", ingredients: [{ productId: w.pepino.id, quantity: "0" }] }))).toBe("invalid_ingredient_quantity");
    expect(await code(createRecipe(w.ctx, w.ownerPirrus, { name: "X", ingredients: [{ productId: w.pepino.id, quantity: "1" }, { productId: w.pepino.id, quantity: "2" }] }))).toBe("duplicate_ingredient");
    expect(await code(createRecipe(w.ctx, w.ownerPirrus, { name: "X", ingredients: [] }))).toBe("recipe_empty");
  });

  it("test_s004_rf12_cambiar_y_quitar_ingredientes", async () => {
    const w = await recipesWorld();
    const r = await negro(w);
    const after = await updateRecipe(w.ctx, w.ownerPirrus, r.id, { name: "Negro", ingredients: [{ productId: w.camaron.id, quantity: "220", note: "22 piezas" }] });
    expect(after.ingredients.map((i) => [i.productName, i.quantity, i.note])).toEqual([["Camarón crudo (Aguachile)", "220", "22 piezas"]]);
  });

  it("test_s004_rf14_un_ingrediente_archivado_se_marca_y_la_receta_sigue_editable", async () => {
    const w = await recipesWorld();
    const r = await negro(w);
    await setArchived(w.ctx, w.ownerPirrus, "products", w.pepino.id, true);
    const detail = await recipeDetail(w.ctx, w.ownerPirrus, r.id);
    expect(detail.ingredients.find((i) => i.productId === w.pepino.id)?.archived).toBe(true);
    expect((await listRecipes(w.ctx, w.ownerPirrus))[0].hasArchivedIngredient).toBe(true);
    // Guardarla otra vez con el ingrediente archivado que ya tenía no falla.
    await updateRecipe(w.ctx, w.ownerPirrus, r.id, { name: "Negro", ingredients: [{ productId: w.pepino.id, quantity: "70" }] });
  });

  it("test_s004_rf15_la_cantidad_se_muestra_en_base_y_en_la_presentacion_de_conteo", async () => {
    const w = await recipesWorld();
    const r = await negro(w);
    const cam = r.ingredients.find((i) => i.productId === w.camaron.id)!;
    expect(cam).toMatchObject({ quantity: "210", baseUnit: "g", count: { name: "Bolsa", quantity: "0.105" } });
    expect(r.ingredients.find((i) => i.productId === w.pepino.id)?.count).toBeNull();
  });

  it("test_s004_rf49_rf52_nombres_duplicados_y_reactivacion", async () => {
    const w = await recipesWorld();
    const r = await negro(w);
    expect(await code(negro(w, { name: " NEGRO " }))).toBe("duplicate_name");
    await setRecipeArchived(w.ctx, w.ownerPirrus, r.id, true);
    await negro(w);
    expect(await code(setRecipeArchived(w.ctx, w.ownerPirrus, r.id, false))).toBe("duplicate_name");
  });

  it("test_s004_rf51_archivar_una_receta_la_saca_de_los_calculos_nuevos", async () => {
    const w = await recipesWorld();
    const r = await negro(w);
    await verde(w);
    const saved = await saveCalculation(w.ctx, w.ownerPirrus, [{ recipeId: r.id, full: 2, half: 0 }]);
    await setRecipeArchived(w.ctx, w.ownerPirrus, r.id, true);
    expect((await calculationBoard(w.ctx, w.ownerPirrus)).recipes.map((x) => x.name)).toEqual(["Verde"]);
    expect((await calculationDetail(w.ctx, w.ownerPirrus, saved.id)).items.map((i) => i.recipeName)).toEqual(["Negro"]);
    expect(await code(previewSupplies(w.ctx, w.ownerPirrus, [{ recipeId: r.id, full: 1, half: 0 }]))).toBe("not_found");
  });

  it("test_s004_rf53_cada_cambio_de_receta_queda_en_el_registro", async () => {
    const w = await recipesWorld();
    const r = await negro(w);
    await updateRecipe(w.ctx, w.ownerPirrus, r.id, { name: "Negro", halfPercent: 60, ingredients: [{ productId: w.camaron.id, quantity: "210" }] });
    await setRecipeArchived(w.ctx, w.ownerPirrus, r.id, true);
    await setRecipeArchived(w.ctx, w.ownerPirrus, r.id, false);
    const entries = await history("recipe", r.id);
    expect(entries.map((e) => e.action)).toEqual(["recipe.created", "recipe.updated", "recipe.archived", "recipe.reactivated"]);
    expect(entries[1].before).toMatchObject({ halfPercent: 50, ingredients: expect.arrayContaining([expect.objectContaining({ quantityBase: "60.000000" })]) });
    expect(entries[1].after).toMatchObject({ halfPercent: 60 });
  });

  it("test_s004_rf55_el_detalle_del_producto_dice_que_recetas_lo_usan", async () => {
    const w = await recipesWorld();
    const r = await negro(w);
    await verde(w);
    expect((await recipesUsingProduct(w.ctx, w.ownerPirrus, w.camaron.id)).map((x) => x.name)).toEqual(["Negro", "Verde"]);
    expect((await recipesUsingProduct(w.ctx, w.ownerPirrus, w.pepino.id)).map((x) => x.name)).toEqual(["Negro"]);
    await setRecipeArchived(w.ctx, w.ownerPirrus, r.id, true);
    expect((await recipesUsingProduct(w.ctx, w.ownerPirrus, w.pepino.id))).toEqual([]);
  });
});

describe("spec 004 — cálculo e historial", () => {
  it("test_s004_rf20_el_calculo_ofrece_todas_las_recetas_activas", async () => {
    const w = await recipesWorld();
    await verde(w);
    await negro(w);
    expect((await calculationBoard(w.ctx, w.ownerPirrus)).recipes.map((r) => [r.name, r.halfPercent])).toEqual([["Negro", 50], ["Verde", 60]]);
  });

  it("test_s004_rf22_rf23_rf25_la_vista_previa_suma_sin_guardar", async () => {
    const w = await recipesWorld();
    const n = await negro(w);
    const v = await verde(w);
    const lines = await previewSupplies(w.ctx, w.ownerPirrus, [
      { recipeId: n.id, full: 30, half: 7 },
      { recipeId: v.id, full: 0, half: 10 },
    ]);
    // Camarón: 33.5 × 210 = 7,035 + 10 medias al 60 % × 210 = 1,260 → 8,295 g → 5 bolsas de 2 kg.
    expect(lines.find((l) => l.productId === w.camaron.id)).toMatchObject({ total: "8295", baseUnit: "g", purchase: { name: "Bolsa", factor: "2000", count: 5 } });
    expect(lines.map((l) => l.name)).toEqual(["Camarón crudo (Aguachile)", "Limón", "Pepino", "Salsa negra Especial"]);
    expect(await listCalculations(w.ctx, w.ownerPirrus)).toEqual([]);
  });

  it("test_s004_rf21_piezas_invalidas_se_rechazan", async () => {
    const w = await recipesWorld();
    const n = await negro(w);
    expect(await code(previewSupplies(w.ctx, w.ownerPirrus, [{ recipeId: n.id, full: 10000, half: 0 }]))).toBe("invalid_pieces");
    expect(await code(previewSupplies(w.ctx, w.ownerPirrus, [{ recipeId: n.id, full: 1.5, half: 0 }]))).toBe("invalid_pieces");
  });

  it("test_s004_rf27_un_ingrediente_archivado_va_marcado_en_la_lista", async () => {
    const w = await recipesWorld();
    const n = await negro(w);
    await setArchived(w.ctx, w.ownerPirrus, "products", w.salsa.id, true);
    const lines = await previewSupplies(w.ctx, w.ownerPirrus, [{ recipeId: n.id, full: 1, half: 0 }]);
    expect(lines.find((l) => l.productId === w.salsa.id)?.archived).toBe(true);
  });

  it("test_s004_rf28_no_se_guarda_un_calculo_en_cero", async () => {
    const w = await recipesWorld();
    const n = await negro(w);
    expect(await code(saveCalculation(w.ctx, w.ownerPirrus, [{ recipeId: n.id, full: 0, half: 0 }]))).toBe("calculation_empty");
    expect(await code(saveCalculation(w.ctx, w.ownerPirrus, []))).toBe("calculation_empty");
  });

  it("test_s004_rf2_rf5_rf29_rf30_el_historial_es_de_la_sucursal_con_autor_y_fecha", async () => {
    const w = await recipesWorld();
    const n = await negro(w);
    const first = await saveCalculation(w.ctx, w.ownerPirrus, [{ recipeId: n.id, full: 10, half: 2 }]);
    w.ctx.clock.advance(60_000);
    const second = await saveCalculation(w.ctx, w.adminPirrus, [{ recipeId: n.id, full: 5, half: 0 }]);
    const list = await listCalculations(w.ctx, w.ownerPirrus);
    expect(list.map((c) => c.id)).toEqual([second.id, first.id]);
    expect(list[1]).toMatchObject({ authorName: w.owner.name, dishes: 1, pieces: 10, halves: 2 });
    const detail = await calculationDetail(w.ctx, w.ownerPirrus, first.id);
    expect(detail.items).toEqual([{ recipeId: n.id, recipeName: "Negro", full: 10, half: 2, halfPercent: 50 }]);
    expect(detail.lines.find((l) => l.productId === w.camaron.id)?.total).toBe("2310");
    // Otra sucursal u otro negocio no lo ven.
    expect(await listCalculations(w.ctx, w.adminSendero)).toEqual([]);
    expect(await code(calculationDetail(w.ctx, w.adminSendero, first.id))).toBe("not_found");
  });

  it("test_s004_rf19_rf31_rf32_un_calculo_guardado_no_cambia", async () => {
    const w = await recipesWorld();
    const n = await negro(w);
    const saved = await saveCalculation(w.ctx, w.ownerPirrus, [{ recipeId: n.id, full: 10, half: 4 }]);
    await updateRecipe(w.ctx, w.ownerPirrus, n.id, { name: "Negro nuevo", halfPercent: 100, ingredients: [{ productId: w.camaron.id, quantity: "300" }] });
    await updatePresentation(w.ctx, w.ownerPirrus, w.camaron.presentationId!, { factor: "1000" });
    const detail = await calculationDetail(w.ctx, w.ownerPirrus, saved.id);
    expect(detail.items[0]).toMatchObject({ recipeName: "Negro", halfPercent: 50, full: 10, half: 4 });
    expect(detail.lines.find((l) => l.productId === w.camaron.id)).toMatchObject({ total: "2520", purchase: { name: "Bolsa", factor: "2000", count: 2 } });
  });

  it("test_s004_rf33_rf34_usar_como_base_con_recetas_vigentes", async () => {
    const w = await recipesWorld();
    const n = await negro(w);
    const v = await verde(w);
    const saved = await saveCalculation(w.ctx, w.ownerPirrus, [
      { recipeId: n.id, full: 10, half: 2 },
      { recipeId: v.id, full: 3, half: 0 },
    ]);
    await setRecipeArchived(w.ctx, w.ownerPirrus, v.id, true);
    const base = await calculationBase(w.ctx, w.ownerPirrus, saved.id);
    expect(base.items).toEqual([{ recipeId: n.id, full: 10, half: 2 }]);
    expect(base.dropped).toEqual(["Verde"]);
  });
});

describe("spec 004 — plantillas", () => {
  it("test_s004_rf35_rf36_guardar_y_usar_una_plantilla", async () => {
    const w = await recipesWorld();
    const n = await negro(w);
    const t = await saveTemplate(w.ctx, w.ownerPirrus, { name: "Fin de semana", items: [{ recipeId: n.id, full: 40, half: 7 }] });
    expect((await listTemplates(w.ctx, w.ownerPirrus)).map((x) => x.name)).toEqual(["Fin de semana"]);
    const start = await templateStart(w.ctx, w.ownerPirrus, t.id);
    expect(start.items).toEqual([{ recipeId: n.id, full: 40, half: 7 }]);
    expect(await listTemplates(w.ctx, w.adminSendero)).toEqual([]);
    expect(await code(templateStart(w.ctx, w.adminSendero, t.id))).toBe("not_found");
  });

  it("test_s004_rf37_un_nombre_ocupado_pide_confirmar_y_reemplaza", async () => {
    const w = await recipesWorld();
    const n = await negro(w);
    const t = await saveTemplate(w.ctx, w.ownerPirrus, { name: "Fin de semana", items: [{ recipeId: n.id, full: 40, half: 0 }] });
    expect(await code(saveTemplate(w.ctx, w.ownerPirrus, { name: "fin de SEMANA", items: [{ recipeId: n.id, full: 50, half: 0 }] }))).toBe("template_exists");
    expect((await templateStart(w.ctx, w.ownerPirrus, t.id)).items[0].full).toBe(40);
    const replaced = await saveTemplate(w.ctx, w.ownerPirrus, { name: "fin de SEMANA", items: [{ recipeId: n.id, full: 50, half: 0 }], replace: true });
    expect(replaced.id).toBe(t.id);
    expect((await templateStart(w.ctx, w.ownerPirrus, t.id)).items[0].full).toBe(50);
  });

  it("test_s004_rf38_rf52_renombrar_archivar_y_reactivar", async () => {
    const w = await recipesWorld();
    const n = await negro(w);
    const items = [{ recipeId: n.id, full: 1, half: 0 }];
    const t = await saveTemplate(w.ctx, w.ownerPirrus, { name: "Sábado", items });
    expect((await renameTemplate(w.ctx, w.ownerPirrus, t.id, "Sábado normal")).name).toBe("Sábado normal");
    await setTemplateArchived(w.ctx, w.ownerPirrus, t.id, true);
    expect((await listTemplates(w.ctx, w.ownerPirrus))[0].archived).toBe(true);
    await saveTemplate(w.ctx, w.ownerPirrus, { name: "Sábado normal", items });
    expect(await code(setTemplateArchived(w.ctx, w.ownerPirrus, t.id, false))).toBe("duplicate_name");
    expect(await code(renameTemplate(w.ctx, w.ownerPirrus, t.id, ""))).toBe("catalog_name_invalid");
  });

  it("test_s004_rf39_una_plantilla_con_receta_archivada_avisa", async () => {
    const w = await recipesWorld();
    const n = await negro(w);
    const v = await verde(w);
    const t = await saveTemplate(w.ctx, w.ownerPirrus, { name: "Diario", items: [{ recipeId: n.id, full: 1, half: 0 }, { recipeId: v.id, full: 2, half: 0 }] });
    await setRecipeArchived(w.ctx, w.ownerPirrus, n.id, true);
    const start = await templateStart(w.ctx, w.ownerPirrus, t.id);
    expect(start.items).toEqual([{ recipeId: v.id, full: 2, half: 0 }]);
    expect(start.dropped).toEqual(["Negro"]);
  });

  it("test_s004_rf53_las_plantillas_quedan_en_el_registro", async () => {
    const w = await recipesWorld();
    const n = await negro(w);
    const t = await saveTemplate(w.ctx, w.ownerPirrus, { name: "Diario", items: [{ recipeId: n.id, full: 1, half: 0 }] });
    await saveTemplate(w.ctx, w.ownerPirrus, { name: "Diario", items: [{ recipeId: n.id, full: 2, half: 0 }], replace: true });
    await renameTemplate(w.ctx, w.ownerPirrus, t.id, "Diario 2");
    expect((await history("recipe_template", t.id)).map((e) => e.action)).toEqual(["recipe_template.created", "recipe_template.replaced", "recipe_template.renamed"]);
  });
});

describe("spec 004 — importación", () => {
  const header = ["Ingredientes ", "Cantidad bruta ", "Unidad", "Nota "];
  const file = () =>
    xlsx([
      { name: "NEGRO", rows: [["NEGRO "], header, ["pepino", 60, "Gramos ", "1 puño lunas"], ["camaron crudo (aguachile)", 210, "gramos"], ["1.- Colocar el pepino"]] },
      { name: "VERDE", rows: [["VERDE"], header, ["limones", 140, "Gramos"]] },
      { name: "ROJO", rows: [["ROJO"], header, ["salsa negra especial", 100, "Mililitros"]] },
    ]);

  it("test_s004_rf42_la_revision_no_guarda_nada", async () => {
    const w = await recipesWorld();
    await createRecipe(w.ctx, w.ownerPirrus, { name: "Rojo", ingredients: [{ productId: w.pepino.id, quantity: "1" }] });
    const review = await reviewImport(w.ctx, w.ownerPirrus, file());
    expect(review.dishes.map((d) => [d.name, d.status])).toEqual([["NEGRO", "ready"], ["VERDE", "problems"], ["ROJO", "exists"]]);
    expect(review.dishes[1].problems).toEqual([expect.objectContaining({ code: "missing_product", ingredient: "limones" })]);
    expect((await listRecipes(w.ctx, w.ownerPirrus)).map((r) => r.name)).toEqual(["Rojo"]);
  });

  it("test_s004_rf46_rf47_rf17_al_confirmar_solo_entran_los_listos_con_media_al_50", async () => {
    const w = await recipesWorld();
    await createRecipe(w.ctx, w.ownerPirrus, { name: "Rojo", ingredients: [{ productId: w.pepino.id, quantity: "1" }] });
    expect(await confirmImport(w.ctx, w.adminPirrus, file())).toEqual({ imported: 1, skipped: 2 });
    const recipes = await listRecipes(w.ctx, w.ownerPirrus);
    expect(recipes.map((r) => r.name)).toEqual(["NEGRO", "Rojo"]);
    const imported = await recipeDetail(w.ctx, w.ownerPirrus, recipes[0].id);
    expect(imported).toMatchObject({ halfPercent: 50, preparation: "1.- Colocar el pepino" });
    expect(imported.ingredients.map((i) => [i.productName, i.quantity, i.note])).toEqual([["Pepino", "60", "1 puño lunas"], ["Camarón crudo (Aguachile)", "210", null]]);
    expect((await history("recipe", recipes[0].id)).map((e) => e.action)).toEqual(["recipe.imported"]);
    // Importar otra vez el mismo archivo no duplica.
    expect(await confirmImport(w.ctx, w.ownerPirrus, file())).toEqual({ imported: 0, skipped: 3 });
  });

  it("test_s004_rf48_un_archivo_invalido_no_guarda_nada", async () => {
    const w = await recipesWorld();
    expect(await code(reviewImport(w.ctx, w.ownerPirrus, Buffer.from("no soy excel")))).toBe("invalid_file");
    expect(await code(confirmImport(w.ctx, w.ownerPirrus, Buffer.from("no soy excel")))).toBe("invalid_file");
    expect(await listRecipes(w.ctx, w.ownerPirrus)).toEqual([]);
  });

  it("test_s004_rf4_importar_pide_permiso_sobre_el_negocio", async () => {
    const w = await recipesWorld();
    // El administrador de Sendero no tiene Pirrus: con su sucursal activa importa en Pastatti, nunca en Pirrus.
    await confirmImport(w.ctx, w.adminSendero, file());
    expect(await listRecipes(w.ctx, w.ownerPirrus)).toEqual([]);
  });
});
