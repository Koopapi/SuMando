import { describe, expect, it } from "vitest";
import { levelsProblem } from "./levels";

describe("spec 003 — mínimos y máximos", () => {
  it("test_s003_rf24_el_maximo_no_puede_ser_menor_que_el_minimo", () => {
    expect(levelsProblem(5n, 4n)).toBe("max_below_min");
    expect(levelsProblem(5n, 5n)).toBeNull();
    expect(levelsProblem(5n, 9n)).toBeNull();
  });

  it("test_s003_rf22_minimo_y_maximo_son_opcionales", () => {
    expect(levelsProblem(null, null)).toBeNull();
    expect(levelsProblem(null, 3n)).toBeNull();
    expect(levelsProblem(3n, null)).toBeNull();
  });

  it("test_s003_rf25_un_minimo_o_maximo_negativo_se_rechaza", () => {
    expect(levelsProblem(-1n, null)).toBe("negative");
    expect(levelsProblem(null, -1n)).toBe("negative");
  });
});
