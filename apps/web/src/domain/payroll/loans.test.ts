import { describe, expect, it } from "vitest";
import { applyPayment, loanProblem, proposedPayment, revertPayment } from "./loans";

describe("spec 009 — préstamos", () => {
  it("test_s009_rf27_monto_y_abono_mayores_que_cero", () => {
    expect(loanProblem(100_000n, 30_000n)).toBeNull();
    expect(loanProblem(0n, 30_000n)).toBe("invalid_amount");
    expect(loanProblem(100_000n, 0n)).toBe("invalid_amount");
  });

  it("test_s009_rf28_el_abono_no_pasa_del_monto", () => {
    expect(loanProblem(100_000n, 100_001n)).toBe("weekly_over_amount");
    expect(loanProblem(100_000n, 100_000n)).toBeNull();
  });

  it("test_s009_rf29_abono_propuesto_es_el_menor_de_abono_y_saldo", () => {
    expect(proposedPayment({ weeklyCents: 30_000n, balanceCents: 100_000n })).toBe(30_000n);
    expect(proposedPayment({ weeklyCents: 30_000n, balanceCents: 10_000n })).toBe(10_000n);
    expect(proposedPayment({ weeklyCents: 30_000n, balanceCents: 0n })).toBe(0n);
  });

  it("test_s009_rf31_un_abono_mayor_que_el_saldo_no_se_aplica", () => {
    expect(() => applyPayment(10_000n, 10_001n)).toThrow("close_loan_over");
  });

  it("test_s009_rf32_cerrar_resta_el_abono_del_saldo", () => {
    expect(applyPayment(100_000n, 30_000n)).toEqual({ balanceCents: 70_000n, settled: false });
  });

  it("test_s009_rf33_saldo_cero_liquida_el_prestamo", () => {
    let balance = 100_000n;
    const paid: bigint[] = [];
    for (let i = 0; i < 6 && balance > 0n; i++) {
      const p = proposedPayment({ weeklyCents: 30_000n, balanceCents: balance });
      paid.push(p);
      const r = applyPayment(balance, p);
      balance = r.balanceCents;
      if (r.settled) break;
    }
    expect(paid).toEqual([30_000n, 30_000n, 30_000n, 10_000n]);
    expect(balance).toBe(0n);
    expect(revertPayment(0n, 10_000n)).toBe(10_000n);
  });
});
