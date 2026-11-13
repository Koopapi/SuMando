// Estados de una requisición y de sus grupos por proveedor (spec 007, RF-22 a RF-29, RF-33, RF-34, RF-37 a RF-40,
// RF-46). Reglas puras: el servicio las aplica dentro de una transacción.
export const REQUISITION_STATUSES = ["requested", "approved", "rejected", "cancelled", "closed"] as const;
export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number];
export type GroupStatus = "to_buy" | "purchased" | "partial" | "received";

export interface LineState {
  quantityMicro: bigint;
  receivedMicro: bigint;
  closed: boolean;
}

/** RF-24 y RF-46: solo se editan (y se quitan renglones) mientras está solicitada. */
export const canEdit = (s: RequisitionStatus) => s === "requested";
/** RF-25 y RF-26: el dueño aprueba o rechaza una solicitada. */
export const canDecide = (s: RequisitionStatus) => s === "requested";
/** RF-28: se cancela solicitada o aprobada mientras no se haya recibido nada. */
export const canCancel = (s: RequisitionStatus, anyReceived: boolean) => (s === "requested" || s === "approved") && !anyReceived;
/** RF-29 y RF-34: se compra y se recibe en una aprobada. */
export const canOperate = (s: RequisitionStatus) => s === "approved";

/** RF-38: lo que falta por recibir de un renglón (cero si está cerrado o ya llegó todo). */
export function pendingOf(l: LineState): bigint {
  if (l.closed) return 0n;
  const left = l.quantityMicro - l.receivedMicro;
  return left > 0n ? left : 0n;
}

/** RF-37: lo que llegó de más. */
export function excessOf(l: LineState): bigint {
  const extra = l.receivedMicro - l.quantityMicro;
  return extra > 0n ? extra : 0n;
}

export const lineDone = (l: LineState) => l.closed || l.receivedMicro >= l.quantityMicro;

/** RF-33: por comprar, comprado, recibido en parte o recibido. */
export function groupStatus(purchased: boolean, lines: LineState[]): GroupStatus {
  if (lines.length && lines.every(lineDone)) return "received";
  if (lines.some((l) => l.receivedMicro > 0n || l.closed)) return "partial";
  return purchased ? "purchased" : "to_buy";
}

/** RF-40: cuando todo está recibido o cerrado, la requisición se cierra. */
export const allDone = (lines: LineState[]) => lines.length > 0 && lines.every(lineDone);
