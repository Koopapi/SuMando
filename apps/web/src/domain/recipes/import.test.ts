import { describe, expect, it } from "vitest";
import { analyzeSheets, type ImportProduct } from "./import";

const products: ImportProduct[] = [
  { id: "pep", name: "Pepino", baseUnit: "g" },
  { id: "cam", name: "Camarón crudo (Aguachile)", baseUnit: "g" },
  { id: "sal", name: "Salsa negra Especial", baseUnit: "ml" },
  { id: "hue", name: "Huevo", baseUnit: "pz" },
];
const header = ["Ingredientes ", "Cantidad bruta ", "unidad", "Nota "];
const sheet = (name: string, rows: string[][]) => ({ name, rows: [[name], header, ...rows] });
const negro = sheet("NEGRO ", [
  ["pepino", "60", "Gramos ", "1 puño lunas "],
  ["camaron crudo (Aguachile)", "210", "gramos", "21 piezas "],
  ["salsa negra Especial ", "100", "Mililitros ", "1/2 taza "],
  ["1.- Colocar en un plato una cama de pepino"],
  ["2.- Curtir con el jugo de 4 limones "],
]);
const analyze = (sheets: { name: string; rows: string[][] }[], existing: string[] = []) => analyzeSheets(sheets, products, existing);

describe("spec 004 — análisis de hojas para importar", () => {
  it("test_s004_rf40_una_hoja_con_el_formato_del_recetario_queda_lista", () => {
    const [dish] = analyze([negro]);
    expect(dish.status).toBe("ready");
    expect(dish.name).toBe("NEGRO");
    expect(dish.recipe?.ingredients).toEqual([
      { productId: "pep", quantityMicro: 60_000_000n, note: "1 puño lunas" },
      { productId: "cam", quantityMicro: 210_000_000n, note: "21 piezas" },
      { productId: "sal", quantityMicro: 100_000_000n, note: "1/2 taza" },
    ]);
    expect(dish.recipe?.preparation).toBe("1.- Colocar en un plato una cama de pepino\n2.- Curtir con el jugo de 4 limones");
  });

  it("test_s004_rf40_el_nombre_sale_de_la_primera_celda_y_sin_nota_tambien_vale", () => {
    const [dish] = analyze([{ name: "Hoja1", rows: [["  Huevo  cocido "], header, ["Huevo", "2", "Piezas"]] }]);
    expect(dish).toMatchObject({ status: "ready", name: "Huevo cocido", sheet: "Hoja1" });
    expect(dish.recipe?.ingredients).toEqual([{ productId: "hue", quantityMicro: 2_000_000n, note: null }]);
    expect(dish.recipe?.preparation).toBeNull();
  });

  it("test_s004_rf40_una_hoja_sin_nombre_encabezado_o_ingredientes_tiene_problemas", () => {
    const [noName, noHeader, noIngredients] = analyze([
      { name: "A", rows: [[""], header, ["pepino", "1", "Gramos"]] },
      { name: "B", rows: [["B"], ["pepino", "1", "Gramos"]] },
      { name: "C", rows: [["C"], header, ["1.- Paso"]] },
    ]);
    expect(noName.problems).toContainEqual({ code: "no_name" });
    expect(noHeader.problems).toContainEqual({ code: "no_header" });
    expect(noIngredients.problems).toContainEqual({ code: "no_ingredients" });
    expect([noName, noHeader, noIngredients].every((d) => d.status === "problems" && !d.recipe)).toBe(true);
  });

  it("test_s004_rf41_las_unidades_aceptadas_sin_mayusculas_acentos_ni_espacios", () => {
    const [ok, bad] = analyze([
      sheet("A", [["pepino", "1", " GRAMOS "], ["salsa negra especial", "1", "mililitros"], ["huevo", "1", "piezas"]]),
      sheet("B", [["pepino", "1", "kilos"]]),
    ]);
    expect(ok.status).toBe("ready");
    expect(bad.problems).toEqual([{ code: "unknown_unit", ingredient: "pepino", unit: "kilos" }]);
  });

  it("test_s004_rf10_una_cantidad_invalida_es_un_problema", () => {
    const [dish] = analyze([sheet("A", [["pepino", "0", "Gramos"], ["huevo", "1.2345", "Piezas"], ["salsa negra especial", "", "Mililitros"]])]);
    expect(dish.problems).toEqual([
      { code: "invalid_quantity", ingredient: "pepino", value: "0" },
      { code: "invalid_quantity", ingredient: "huevo", value: "1.2345" },
      { code: "invalid_quantity", ingredient: "salsa negra especial", value: "" },
    ]);
  });

  it("test_s004_rf43_los_ingredientes_se_buscan_sin_mayusculas_acentos_ni_espacios", () => {
    const [dish] = analyze([sheet("A", [["  CAMARON crudo (aguachile) ", "1", "Gramos"]])]);
    expect(dish.recipe?.ingredients[0].productId).toBe("cam");
  });

  it("test_s004_rf44_un_ingrediente_que_no_esta_en_el_catalogo_se_indica", () => {
    const [dish] = analyze([sheet("A", [["limones", "140", "Gramos"], ["pepino", "60", "Gramos"]])]);
    expect(dish.status).toBe("problems");
    expect(dish.problems).toEqual([{ code: "missing_product", ingredient: "limones" }]);
  });

  it("test_s004_rf45_una_unidad_distinta_a_la_del_catalogo_se_indica", () => {
    const [dish] = analyze([sheet("A", [["salsa negra Especial", "100", "Gramos"]])]);
    expect(dish.problems).toEqual([{ code: "unit_mismatch", ingredient: "salsa negra Especial", sheetUnit: "g", productUnit: "ml" }]);
  });

  it("test_s004_rf11_un_ingrediente_repetido_en_la_hoja_se_indica", () => {
    const [dish] = analyze([sheet("A", [["pepino", "60", "Gramos"], ["Pepino", "10", "Gramos"]])]);
    expect(dish.problems).toEqual([{ code: "repeated_ingredient", ingredient: "Pepino" }]);
  });

  it("test_s004_rf46_un_platillo_que_ya_existe_no_se_reemplaza", () => {
    const [dish] = analyze([negro], ["negro"]);
    expect(dish.status).toBe("exists");
    expect(dish.recipe).toBeUndefined();
  });

  it("test_s004_rf46_dos_hojas_del_mismo_platillo_la_segunda_queda_fuera", () => {
    const copy = { ...negro, name: "TOSTI PIRRUS" };
    const [first, second] = analyze([negro, copy]);
    expect(first.status).toBe("ready");
    expect(second).toMatchObject({ status: "duplicate", sheet: "TOSTI PIRRUS", name: "NEGRO" });
  });

  it("test_s004_rf50_un_nombre_de_mas_de_80_es_un_problema", () => {
    const [dish] = analyze([sheet("x".repeat(81), [["pepino", "1", "Gramos"]])]);
    expect(dish.problems).toContainEqual({ code: "name_too_long" });
  });
});
