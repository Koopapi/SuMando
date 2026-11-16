import { describe, expect, it } from "vitest";
import { cashBreakdown, DENOMINATIONS, sumBreakdowns } from "./cash";

describe("spec 009 — billetes", () => {
  it("test_s009_rf42_desglose_de_la_denominacion_mas_alta", () => {
    const b = cashBreakdown(195_050n);
    expect(b.pieces).toEqual([
      { cents: 100_000n, count: 1 },
      { cents: 50_000n, count: 1 },
      { cents: 20_000n, count: 2 },
      { cents: 5_000n, count: 1 },
      { cents: 50n, count: 1 },
    ]);
    expect(b.leftoverCents).toBe(0n);
    expect(DENOMINATIONS.map((d) => d.cents)).toEqual([100_000n, 50_000n, 20_000n, 10_000n, 5_000n, 2_000n, 1_000n, 500n, 200n, 100n, 50n]);
  });

  it("test_s009_rf42_los_centavos_bajo_50_quedan_aparte", () => {
    const b = cashBreakdown(16_667n);
    expect(b.leftoverCents).toBe(17n);
    expect(b.pieces.reduce((a, p) => a + p.cents * BigInt(p.count), 0n) + b.leftoverCents).toBe(16_667n);
    expect(cashBreakdown(0n).pieces).toEqual([]);
  });

  it("test_s009_rf43_total_por_denominacion_de_la_semana", () => {
    const t = sumBreakdowns([cashBreakdown(120_000n), cashBreakdown(60_000n)]);
    expect(t.pieces).toEqual([
      { cents: 100_000n, count: 1 },
      { cents: 50_000n, count: 1 },
      { cents: 20_000n, count: 1 },
      { cents: 10_000n, count: 1 },
    ]);
  });
});
