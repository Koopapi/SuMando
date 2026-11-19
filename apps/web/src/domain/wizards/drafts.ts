// Borradores de los asistentes (spec 015, RF-17, RF-22, RF-51): qué asistentes hay, cuáles son del teléfono de piso,
// cuáles trabajan sobre algo que ya existe y cuánto duran sin cambios.
export const WIZARD_KINDS = [
  "req-new",
  "req-approve",
  "req-buy",
  "req-receive",
  "inv-count",
  "inv-entry",
  "inv-exit",
  "inv-transfer",
  "inv-transfer-receive",
  "pay-attendance",
  "pay-close",
  "cash-open",
  "cash-cut",
  "cash-pos",
  "new-product",
  "new-supplier",
  "new-employee",
  "new-checklist",
  "floor-checklist",
  "floor-cash",
] as const;
export type WizardKind = (typeof WIZARD_KINDS)[number];

export const isWizardKind = (v: unknown): v is WizardKind => typeof v === "string" && (WIZARD_KINDS as readonly string[]).includes(v);

const FLOOR: readonly WizardKind[] = ["floor-checklist", "floor-cash"];
export const isFloorKind = (k: WizardKind) => FLOOR.includes(k);

/** Trabajan sobre una requisición, traspaso, semana, corte o plantilla concretos: el borrador lleva su id. */
const TARGETED: readonly WizardKind[] = ["req-approve", "req-buy", "req-receive", "inv-transfer-receive", "pay-attendance", "pay-close", "cash-cut", "cash-pos", "floor-checklist"];
export const needsTarget = (k: WizardKind) => TARGETED.includes(k);

export const DRAFT_TTL_DAYS = 7;
export const DRAFT_MAX_BYTES = 256 * 1024;

/** RF-51: más de 7 días sin cambios. */
export const draftExpired = (updatedAt: Date, now: Date) => now.getTime() - updatedAt.getTime() > DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000;
