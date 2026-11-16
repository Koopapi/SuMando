import { describe, expect, it } from "vitest";
import { cleanPieces, cutFigures, expectedCash, piecesTotal, sumMovements } from "./calc";

// Hoja de corte de referencia (sin nombres): piezas, fondo, ingresos, gastos y lo de cada terminal.
const REF_PIECES = { "100000": 4, "50000": 187, "10000": 2, "5000": 10 };
const REF_EXPENSES = [431_700n, 114_100n, 402_800n, 548_500n, 55_000n, 13_000n, 270_000n];

describe("spec 011 — cálculo del corte", () => {
  it("test_s011_rf18_rf19_efectivo_por_piezas_de_la_hoja_de_referencia", () => {
    expect(piecesTotal(cleanPieces(REF_PIECES)!)).toBe(9_820_000n);
  });

  it("test_s011_rf21_piezas_enteras_de_cero_o_mas", () => {
    expect(cleanPieces({ "100000": 1.5 })).toBeNull();
    expect(cleanPieces({ "100000": -1 })).toBeNull();
    expect(cleanPieces({ "300": 1 })).toBeNull();
    expect(cleanPieces({ "50": 3, "100": 0 })).toEqual({ "50": 3 });
  });

  it("test_s011_rf24_efectivo_esperado", () => {
    const m = sumMovements([
      { kind: "expense", amountCents: 10_000n, cancelled: false },
      { kind: "withdrawal", amountCents: 50_000n, cancelled: false },
      { kind: "income", amountCents: 20_000n, cancelled: false },
      { kind: "expense", amountCents: 99_999n, cancelled: true },
    ]);
    expect(expectedCash(500_000n, 100_000n, m)).toBe(560_000n);
  });

  it("test_s011_rf25_rf26_diferencia_por_forma_de_pago", () => {
    const m = sumMovements([]);
    const f = cutFigures(100_000n, [
      { isCash: true, counted: 599_950n, pos: 500_000n },
      { isCash: false, counted: 200_000n, pos: 210_000n },
    ], m);
    expect(f.differences).toEqual([-50n, -10_000n]);
    expect(f.totalDifference).toBe(-10_050n);
  });

  it("test_s011_rf27_rf28_rf29_venta_de_la_hoja_de_referencia", () => {
    const m = sumMovements([...REF_EXPENSES.map((amountCents) => ({ kind: "expense" as const, amountCents, cancelled: false })), { kind: "income", amountCents: 390_000n, cancelled: false }]);
    expect(m.expenses).toBe(1_835_100n);
    const terminals = [6_041_855n, 1_694_850n, 4_979_140n, 6_363_840n, 260_000n];
    const f = cutFigures(100_000n, [{ isCash: true, counted: 9_820_000n, pos: 0n }, ...terminals.map((counted) => ({ isCash: false, counted, pos: counted }))], m);
    // Los ingresos no son venta (aclaración del dueño): se restan; los gastos salieron del cajón: se suman.
    expect(f.salesBefore).toBe(9_820_000n - 100_000n - 390_000n + 1_835_100n + 19_339_685n);
    expect(f.salesAfter).toBe(f.salesBefore - 1_835_100n);
    expect(f.expenses).toBe(1_835_100n);
  });
});
