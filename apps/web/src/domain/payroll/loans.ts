// Préstamos al personal (spec 009, RF-27 a RF-33): monto y abono semanal en centavos.
export function loanProblem(amountCents: bigint, weeklyCents: bigint): "invalid_amount" | "weekly_over_amount" | null {
  if (amountCents <= 0n || weeklyCents <= 0n) return "invalid_amount";
  if (weeklyCents > amountCents) return "weekly_over_amount";
  return null;
}

/** RF-29: el abono semanal o el saldo, el que sea menor. */
export const proposedPayment = (loan: { weeklyCents: bigint; balanceCents: bigint }) => (loan.balanceCents < loan.weeklyCents ? loan.balanceCents : loan.weeklyCents);

/** RF-31 a RF-33: al cerrar, el abono baja el saldo; nunca por debajo de cero. */
export function applyPayment(balanceCents: bigint, paymentCents: bigint): { balanceCents: bigint; settled: boolean } {
  if (paymentCents > balanceCents) throw new Error("close_loan_over");
  const left = balanceCents - paymentCents;
  return { balanceCents: left, settled: left === 0n };
}

/** RF-39: al reabrir, el abono vuelve al saldo. */
export const revertPayment = (balanceCents: bigint, paymentCents: bigint) => balanceCents + paymentCents;
