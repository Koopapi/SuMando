// Requisición dividida por comprador (spec 013, RF-8 y RF-9). Reglas puras.
import type { GroupStatus } from "./state";

export interface BuyerRef {
  /** Persona de Personal o, en requisiciones anteriores, el texto escrito. */
  key: string;
  name: string;
}

export interface BuyerBucket<G> {
  /** Nulo = «Sin comprador». */
  buyer: BuyerRef | null;
  groups: G[];
  counts: { toBuy: number; purchased: number; received: number };
}

/** RF-8: un grupo por comprador, ordenados por nombre, con «Sin comprador» al final; RF-9: cuentas por estado
 * (recibido en parte cuenta como comprado). */
export function byBuyer<G extends { buyer: BuyerRef | null; status: GroupStatus }>(groups: G[]): BuyerBucket<G>[] {
  const buckets = new Map<string | null, BuyerBucket<G>>();
  for (const g of groups) {
    const key = g.buyer?.key ?? null;
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { buyer: g.buyer, groups: [], counts: { toBuy: 0, purchased: 0, received: 0 } }));
    b.groups.push(g);
    if (g.status === "to_buy") b.counts.toBuy++;
    else if (g.status === "received") b.counts.received++;
    else b.counts.purchased++;
  }
  return [...buckets.values()].sort((a, b) => (a.buyer === null ? 1 : b.buyer === null ? -1 : a.buyer.name.localeCompare(b.buyer.name, "es")));
}
