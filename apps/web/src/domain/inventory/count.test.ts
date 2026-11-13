import { describe, expect, it } from "vitest";
import { changedSinceOpened, countResult, fillMissing } from "./count";

describe("spec 005 — conteo físico", () => {
  it("test_s005_rf46_igual_captura_lo_esperado", () => {
    expect(fillMissing<"a">({ a: undefined }, { a: "3" })).toEqual({ a: "3" });
  });

  it("test_s005_rf47_lo_que_falta_igual_no_toca_lo_ya_capturado", () => {
    expect(fillMissing<"a" | "b" | "c">({ a: "1", b: "", c: undefined }, { a: "5", b: "6", c: "7" })).toEqual({ a: "1", b: "6", c: "7" });
  });

  it("test_s005_rf49_la_existencia_queda_en_lo_contado_y_la_diferencia_se_registra", () => {
    const [line] = countResult([{ productId: "a", countedMicro: 3n, seenMicro: 5n }], new Map([["a", 5n]]));
    expect(line).toEqual({ productId: "a", expectedMicro: 5n, countedMicro: 3n, differenceMicro: -2n });
  });

  it("test_s005_rf50_lo_no_capturado_no_entra_al_resultado", () => {
    const result = countResult([{ productId: "a", countedMicro: 1n, seenMicro: 1n }], new Map([["a", 1n], ["b", 9n]]));
    expect(result.map((l) => l.productId)).toEqual(["a"]);
  });

  it("test_s005_rf51_se_detectan_los_productos_que_cambiaron_desde_que_se_abrio", () => {
    const lines = [
      { productId: "a", countedMicro: 3n, seenMicro: 5n },
      { productId: "b", countedMicro: 3n, seenMicro: 0n },
      { productId: "c", countedMicro: 3n, seenMicro: 0n },
    ];
    expect(changedSinceOpened(lines, new Map([["a", 8n], ["b", 0n]]))).toEqual([{ productId: "a", seenMicro: 5n, nowMicro: 8n }]);
  });

  it("test_s005_rf52_la_diferencia_es_contra_la_existencia_al_aplicar", () => {
    // Vio 5, entró 3 mientras contaba (ahora 8), contó 6: la diferencia es -2, no +1.
    const [line] = countResult([{ productId: "a", countedMicro: 6n, seenMicro: 5n }], new Map([["a", 8n]]));
    expect(line.differenceMicro).toBe(-2n);
    expect(countResult([{ productId: "n", countedMicro: 4n, seenMicro: 0n }], new Map())[0]).toEqual({ productId: "n", expectedMicro: 0n, countedMicro: 4n, differenceMicro: 4n });
  });
});
