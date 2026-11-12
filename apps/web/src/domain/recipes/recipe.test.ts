import { describe, expect, it } from "vitest";
import { recipeProblem, type RecipeDraft } from "./recipe";

const ok: RecipeDraft = { name: "Negro", preparation: "1.- Colocar el pepino", halfPercent: 50, ingredients: [{ productId: "a", quantity: "210", note: "21 piezas" }, { productId: "b", quantity: "0.1" }] };

describe("spec 004 — validación de recetas", () => {
  it("test_s004_rf7_una_receta_valida_con_preparacion_opcional", () => {
    expect(recipeProblem(ok)).toBeNull();
    expect(recipeProblem({ ...ok, preparation: undefined, halfPercent: undefined })).toBeNull();
  });

  it("test_s004_rf8_cada_ingrediente_lleva_producto_cantidad_y_nota_opcional", () => {
    expect(recipeProblem({ ...ok, ingredients: [{ productId: "", quantity: "1" }] })).toEqual({ code: "validation", index: 0 });
    expect(recipeProblem({ ...ok, ingredients: [{ productId: "a", quantity: "1", note: "x".repeat(121) }] })).toEqual({ code: "validation", index: 0 });
  });

  it("test_s004_rf10_la_cantidad_es_positiva_con_hasta_3_decimales", () => {
    for (const bad of ["0", "-1", "1.2345", "abc", ""]) expect(recipeProblem({ ...ok, ingredients: [{ productId: "a", quantity: bad }] })).toEqual({ code: "invalid_ingredient_quantity", index: 0 });
    expect(recipeProblem({ ...ok, ingredients: [{ productId: "a", quantity: "1,25" }] })).toBeNull();
  });

  it("test_s004_rf11_un_producto_no_se_repite_en_la_receta", () => {
    expect(recipeProblem({ ...ok, ingredients: [{ productId: "a", quantity: "1" }, { productId: "a", quantity: "2" }] })).toEqual({ code: "duplicate_ingredient", index: 1 });
  });

  it("test_s004_rf13_una_receta_necesita_al_menos_un_ingrediente", () => {
    expect(recipeProblem({ ...ok, ingredients: [] })).toEqual({ code: "recipe_empty" });
  });

  it("test_s004_rf18_el_porcentaje_de_media_se_valida", () => {
    expect(recipeProblem({ ...ok, halfPercent: 0 })).toEqual({ code: "invalid_half_percent" });
    expect(recipeProblem({ ...ok, halfPercent: 100 })).toBeNull();
  });

  it("test_s004_rf50_el_nombre_no_esta_vacio_ni_pasa_de_80", () => {
    expect(recipeProblem({ ...ok, name: "   " })).toEqual({ code: "catalog_name_invalid" });
    expect(recipeProblem({ ...ok, name: "x".repeat(81) })).toEqual({ code: "catalog_name_invalid" });
    expect(recipeProblem({ ...ok, name: "x".repeat(80) })).toBeNull();
  });

  it("test_s004_rf7_la_preparacion_tiene_limite", () => {
    expect(recipeProblem({ ...ok, preparation: "x".repeat(4001) })).toEqual({ code: "validation" });
  });
});
