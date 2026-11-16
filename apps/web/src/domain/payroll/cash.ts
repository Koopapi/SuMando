// Hoja de pago (spec 009, RF-42, RF-43): billetes y monedas mexicanos, de la denominación más alta a la más baja.
export const DENOMINATIONS = [
  { cents: 100_000n, kind: "bill" },
  { cents: 50_000n, kind: "bill" },
  { cents: 20_000n, kind: "bill" },
  { cents: 10_000n, kind: "bill" },
  { cents: 5_000n, kind: "bill" },
  { cents: 2_000n, kind: "bill" },
  { cents: 1_000n, kind: "coin" },
  { cents: 500n, kind: "coin" },
  { cents: 200n, kind: "coin" },
  { cents: 100n, kind: "coin" },
  { cents: 50n, kind: "coin" },
] as const;

export interface Breakdown {
  pieces: { cents: bigint; count: number }[];
  /** Centavos bajo 50 que no caben en ninguna moneda. */
  leftoverCents: bigint;
}

export function cashBreakdown(netCents: bigint): Breakdown {
  let left = netCents > 0n ? netCents : 0n;
  const pieces: Breakdown["pieces"] = [];
  for (const d of DENOMINATIONS) {
    const count = left / d.cents;
    if (count > 0n) {
      pieces.push({ cents: d.cents, count: Number(count) });
      left -= count * d.cents;
    }
  }
  return { pieces, leftoverCents: left };
}

export function sumBreakdowns(list: Breakdown[]): Breakdown {
  const pieces = DENOMINATIONS.map((d) => ({ cents: d.cents, count: list.reduce((a, b) => a + (b.pieces.find((p) => p.cents === d.cents)?.count ?? 0), 0) })).filter((p) => p.count > 0);
  return { pieces, leftoverCents: list.reduce((a, b) => a + b.leftoverCents, 0n) };
}
