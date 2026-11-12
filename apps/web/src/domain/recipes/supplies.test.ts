import { describe, expect, it } from "vitest";
import { parseFactor, parseMilli, toBaseMicro } from "../catalog/units";
import { centiMicroToDb, computeSupplies, dbToCentiMicro, formatSupply, type SupplyProduct, type SupplyRecipe } from "./supplies";

const q = (grams: string) => toBaseMicro(parseMilli(grams)!, 1000n);
const product = (id: string, name: string, purchase: [string, string] | null = null, archived = false): SupplyProduct => ({
  id,
  name,
  baseUnit: "g",
  archived,
  purchase: purchase ? { name: purchase[0], factorMilli: parseFactor(purchase[1])! } : null,
});

const products = new Map(
  [product("cam", "Camarón", ["Bolsa", "2000"]), product("pep", "Pepino"), product("lim", "Limón", ["Caja", "20000"]), product("sal", "Sal de grano", null, true)].map((p) => [p.id, p]),
);
const negro: SupplyRecipe = { id: "negro", halfPercent: 50, ingredients: [{ productId: "cam", quantityMicro: q("210") }, { productId: "pep", quantityMicro: q("60") }, { productId: "lim", quantityMicro: q("140") }] };
const verde: SupplyRecipe = { id: "verde", halfPercent: 60, ingredients: [{ productId: "cam", quantityMicro: q("210") }, { productId: "sal", quantityMicro: q("1.2") }] };
const recipes = new Map([negro, verde].map((r) => [r.id, r]));

const line = (lines: ReturnType<typeof computeSupplies>, id: string) => lines.find((l) => l.productId === id)!;

describe("spec 004 — suma de insumos", () => {
  it("test_s004_rf16_cada_platillo_usa_su_propio_porcentaje_de_media", () => {
    // Negro: 1 media al 50 % = 105 g; Verde: 1 media al 60 % = 126 g.
    const lines = computeSupplies(recipes, products, [
      { recipeId: "negro", full: 0, half: 1 },
      { recipeId: "verde", full: 0, half: 1 },
    ]);
    expect(formatSupply(line(lines, "cam").totalCentiMicro)).toBe("231");
  });

  it("test_s004_rf23_suma_completas_y_medias_de_todos_los_platillos", () => {
    // Camarón: Negro 40 completas + 7 medias al 50 % = 43.5 × 210 = 9,135; Verde 10 completas = 2,100.
    const lines = computeSupplies(recipes, products, [
      { recipeId: "negro", full: 40, half: 7 },
      { recipeId: "verde", full: 10, half: 0 },
    ]);
    expect(formatSupply(line(lines, "cam").totalCentiMicro)).toBe("11235");
    expect(formatSupply(line(lines, "pep").totalCentiMicro)).toBe("2610");
    expect(formatSupply(line(lines, "sal").totalCentiMicro)).toBe("12");
  });

  it("test_s004_rf23_las_cuentas_son_exactas", () => {
    const tiny: SupplyRecipe = { id: "t", halfPercent: 50, ingredients: [{ productId: "pep", quantityMicro: q("0.1") }] };
    const lines = computeSupplies(new Map([["t", tiny]]), products, [{ recipeId: "t", full: 9999, half: 0 }]);
    expect(formatSupply(lines[0].totalCentiMicro)).toBe("999.9");
    expect(centiMicroToDb(lines[0].totalCentiMicro)).toBe("999.90000000");
    expect(dbToCentiMicro("999.90000000")).toBe(lines[0].totalCentiMicro);
    // 0.1 g × 7 medias al 50 % = 0.35 g, exacto en la base y con 3 decimales al mostrarlo.
    const half = computeSupplies(new Map([["t", tiny]]), products, [{ recipeId: "t", full: 0, half: 7 }]);
    expect(centiMicroToDb(half[0].totalCentiMicro)).toBe("0.35000000");
    expect(formatSupply(half[0].totalCentiMicro)).toBe("0.35");
  });

  it("test_s004_rf24_cada_ingrediente_aparece_una_sola_vez", () => {
    const lines = computeSupplies(recipes, products, [
      { recipeId: "negro", full: 1, half: 0 },
      { recipeId: "verde", full: 1, half: 0 },
    ]);
    expect(lines.filter((l) => l.productId === "cam")).toHaveLength(1);
    expect(lines).toHaveLength(4);
  });

  it("test_s004_rf24_platillos_en_cero_no_aportan_renglones", () => {
    const lines = computeSupplies(recipes, products, [
      { recipeId: "negro", full: 0, half: 0 },
      { recipeId: "verde", full: 1, half: 0 },
    ]);
    expect(lines.map((l) => l.productId).sort()).toEqual(["cam", "sal"]);
  });

  it("test_s004_rf25_presentaciones_de_compra_redondeadas_hacia_arriba", () => {
    // 35 × 210 = 7,350 g de camarón → 4 bolsas de 2 kg; 140 g × 35 = 4,900 g de limón → 1 caja de 20 kg.
    const lines = computeSupplies(recipes, products, [{ recipeId: "negro", full: 35, half: 0 }]);
    expect(line(lines, "cam").purchase).toMatchObject({ name: "Bolsa", count: 4n });
    expect(line(lines, "lim").purchase).toMatchObject({ name: "Caja", count: 1n });
    expect(line(lines, "pep").purchase).toBeNull();
  });

  it("test_s004_rf25_un_multiplo_exacto_no_suma_una_presentacion_de_mas", () => {
    const exact: SupplyRecipe = { id: "e", halfPercent: 50, ingredients: [{ productId: "cam", quantityMicro: q("2000") }] };
    const lines = computeSupplies(new Map([["e", exact]]), products, [{ recipeId: "e", full: 2, half: 0 }]);
    expect(lines[0].purchase?.count).toBe(2n);
  });

  it("test_s004_rf26_la_lista_va_en_orden_alfabetico", () => {
    const lines = computeSupplies(recipes, products, [
      { recipeId: "negro", full: 1, half: 0 },
      { recipeId: "verde", full: 1, half: 0 },
    ]);
    expect(lines.map((l) => l.name)).toEqual(["Camarón", "Limón", "Pepino", "Sal de grano"]);
  });

  it("test_s004_rf27_un_ingrediente_archivado_sigue_en_la_lista_marcado", () => {
    const lines = computeSupplies(recipes, products, [{ recipeId: "verde", full: 1, half: 0 }]);
    expect(line(lines, "sal").archived).toBe(true);
    expect(line(lines, "cam").archived).toBe(false);
  });
});
