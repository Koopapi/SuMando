// Validación de un movimiento (spec 005, RF-10, RF-14 a RF-16, RF-19, RF-64). Reglas puras: el servicio comprueba
// después que productos y almacenes existan, sean del negocio y estén activos.
export const EXIT_REASONS = ["waste", "expired", "staff", "courtesy", "other"] as const;
export type ExitReason = (typeof EXIT_REASONS)[number];
export const isExitReason = (v: unknown): v is ExitReason => typeof v === "string" && (EXIT_REASONS as readonly string[]).includes(v);

export const REFERENCE_MAX = 40;
export const NOTE_MAX = 200;
export const REASON_MIN = 3;
export const REASON_MAX = 200;
export const LINES_MAX = 500;

export type LinesProblem = { code: "movement_empty" } | { code: "duplicate_line"; index: number } | { code: "validation" };

/** Al menos un renglón, como mucho 500, y ningún producto repetido (RF-10). */
export function linesProblem(lines: { productId: string }[]): LinesProblem | null {
  if (lines.length === 0) return { code: "movement_empty" };
  if (lines.length > LINES_MAX) return { code: "validation" };
  const seen = new Set<string>();
  for (const [index, line] of lines.entries()) {
    if (seen.has(line.productId)) return { code: "duplicate_line", index };
    seen.add(line.productId);
  }
  return null;
}

/** Motivo escrito de un ajuste o una cancelación: de 3 a 200 caracteres sin espacios exteriores (RF-18, RF-64). */
export function writtenReason(raw: string | null | undefined): string | null {
  const text = (raw ?? "").trim().replace(/\s+/g, " ");
  return text.length >= REASON_MIN && text.length <= REASON_MAX ? text : null;
}

/** RF-15 y RF-16: el motivo de salida es de la lista; con «otro», la nota es obligatoria. */
export function exitReasonProblem(reason: unknown, note: string | null): "validation" | "reason_required" | null {
  if (!isExitReason(reason)) return "validation";
  if (reason === "other" && !note) return "reason_required";
  return null;
}
