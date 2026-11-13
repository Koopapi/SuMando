// Reglas del expediente (spec 008, RF-9, RF-13, RF-28 a RF-30).
export const LEAVE_REASONS = ["resignation", "dismissal", "abandonment", "season_end", "other"] as const;
export type LeaveReason = (typeof LEAVE_REASONS)[number];
export const isLeaveReason = (v: unknown): v is LeaveReason => typeof v === "string" && (LEAVE_REASONS as readonly string[]).includes(v);

export const NAME_MAX = 80;
export const PHONE_MAX = 30;
export const NOTES_MAX = 500;
export const PAY_MAX_CENTS = 10_000_000n;

/** RF-13: el sueldo por día es mayor que cero. */
export function payProblem(cents: bigint | null | undefined): "invalid_pay" | null {
  if (cents === null || cents === undefined || cents <= 0n || cents > PAY_MAX_CENTS) return "invalid_pay";
  return null;
}

/** RF-30: la baja no puede ser antes del ingreso del periodo actual (el mismo día sí). */
export const leaveBeforeHire = (hiredOn: string, leftOn: string) => leftOn < hiredOn;

/** RF-29: con «otro», la nota es obligatoria (de 3 a 200 caracteres). */
export function leaveProblem(reason: unknown, note: string | null): "validation" | "reason_required" | null {
  if (!isLeaveReason(reason)) return "validation";
  if (reason === "other" && (!note || note.length < 3)) return "reason_required";
  return null;
}
