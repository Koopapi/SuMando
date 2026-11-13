import { describe, expect, it } from "vitest";
import { fromCalculation, mergeLines, roundUp, shortfall } from "./suggest";

const M = 1_000_000n;

describe("spec 007 — sugerencias de la requisición", () => {
  it("test_s007_rf14_falta_lo_necesario_para_llegar_al_maximo_o_al_minimo", () => {
    expect(shortfall(30n * M, 72n * M, 144n * M)).toBe(114n * M);
    expect(shortfall(30n * M, 72n * M, null)).toBe(42n * M);
    expect(shortfall(72n * M, 72n * M, 144n * M)).toBeNull();
    expect(shortfall(5n * M, null, 10n * M)).toBeNull();
    // Con existencia negativa, falta cubrir también el negativo.
    expect(shortfall(-2n * M, 3n * M, null)).toBe(5n * M);
  });

  it("test_s007_rf15_se_redondea_hacia_arriba_a_presentaciones_completas", () => {
    // Mínimo 3 cartones de 24, hay 30 piezas, máximo 6 cartones: faltan 114 piezas = 4.75 cartones → 5 cartones.
    expect(roundUp(114n * M, 24_000n)).toBe(120n * M);
    expect(roundUp(120n * M, 24_000n)).toBe(120n * M);
    expect(roundUp(1_500n, null)).toBe(2_000n);
    expect(roundUp(0n, 24_000n)).toBe(0n);
  });

  it("test_s007_rf16_un_calculo_entra_con_sus_presentaciones_de_compra", () => {
    expect(fromCalculation(808_500_000_000n, { factorMilli: 2_000_000n, count: 5 })).toBe(10_000n * M);
    // 0.1 g × 9,999 = 999.9 g sin presentación de compra.
    expect(fromCalculation(99_990_000_000n, null)).toBe(999_900_000n);
    expect(fromCalculation(1n, null)).toBe(1_000n);
  });

  it("test_s007_rf10_un_producto_repetido_se_suma", () => {
    const merged = mergeLines([
      { productId: "a", quantityMicro: 2n, supplier: "Sams" },
      { productId: "b", quantityMicro: 1n, supplier: "Garis" },
      { productId: "a", quantityMicro: 3n, supplier: "Otro" },
    ]);
    expect(merged).toEqual([
      { productId: "a", quantityMicro: 5n, supplier: "Sams" },
      { productId: "b", quantityMicro: 1n, supplier: "Garis" },
    ]);
  });
});
