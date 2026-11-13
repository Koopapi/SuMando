// Traspasos (spec 005, RF-23, RF-27, RF-31 a RF-33, RF-36, RF-37). Dentro del negocio el traspaso nace hecho
// (`done`); entre negocios nace en camino y termina recibido o cancelado.
export const TRANSFER_STATUSES = ["done", "in_transit", "received", "cancelled"] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export type TransferAction = "receive" | "cancel";

/** RF-36 y RF-37: se recibe o se cancela uno en camino; uno interno hecho se puede cancelar (RF-64). */
export function canTransition(status: TransferStatus, action: TransferAction, crossBusiness: boolean): boolean {
  if (action === "receive") return crossBusiness && status === "in_transit";
  return crossBusiness ? status === "in_transit" : status === "done";
}

/** RF-23: origen y destino distintos. */
export const sameWarehouse = (from: string, to: string) => from === to;

export interface CandidateProduct {
  id: string;
  nameKey: string;
  baseUnit: string;
  archived: boolean;
}

/**
 * Producto propuesto en el negocio que recibe (RF-31, RF-33): la correspondencia recordada si sigue activa y con la
 * misma unidad base; si no, el activo con la misma clave de nombre y unidad; si no, ninguno (RF-32).
 */
export function proposeProduct(line: { nameKey: string; baseUnit: string }, linkedId: string | null, candidates: CandidateProduct[]): string | null {
  const usable = (p: CandidateProduct | undefined) => p && !p.archived && p.baseUnit === line.baseUnit;
  const linked = candidates.find((p) => p.id === linkedId);
  if (usable(linked)) return linked!.id;
  const byName = candidates.find((p) => p.nameKey === line.nameKey && usable(p));
  return byName?.id ?? null;
}
