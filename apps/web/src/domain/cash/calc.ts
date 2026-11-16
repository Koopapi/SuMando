// Cálculo del corte de caja (spec 011, RF-18, RF-19, RF-21, RF-24 a RF-29), en centavos enteros.
import { DENOMINATIONS } from "../payroll/cash";

export const MOVEMENT_KINDS = ["expense", "withdrawal", "income"] as const;
export type MovementKind = (typeof MOVEMENT_KINDS)[number];
export const CONCEPT_MAX = 80;
export const METHOD_NAME_MAX = 40;
export const NOTE_MAX = 300;

/** Piezas por denominación, con la denominación en centavos como clave («100000»: 4). */
export type Pieces = Record<string, number>;

export const DENOMINATION_KEYS = DENOMINATIONS.map((d) => d.cents.toString());

/** RF-21: piezas enteras de cero o más, solo de las denominaciones conocidas. */
export function cleanPieces(raw: unknown): Pieces | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const out: Pieces = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!DENOMINATION_KEYS.includes(k)) return null;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 1_000_000) return null;
    if (v > 0) out[k] = v;
  }
  return out;
}

/** RF-19: Σ piezas × denominación. */
export const piecesTotal = (p: Pieces) => Object.entries(p).reduce((a, [k, n]) => a + BigInt(k) * BigInt(n), 0n);

export interface Movements {
  expenses: bigint;
  withdrawals: bigint;
  incomes: bigint;
}

export function sumMovements(list: { kind: MovementKind; amountCents: bigint; cancelled: boolean }[]): Movements {
  const sum = (k: MovementKind) => list.filter((m) => m.kind === k && !m.cancelled).reduce((a, m) => a + m.amountCents, 0n);
  return { expenses: sum("expense"), withdrawals: sum("withdrawal"), incomes: sum("income") };
}

/** RF-24: lo que debería haber en el cajón. */
export const expectedCash = (posCash: bigint, fund: bigint, m: Movements) => posCash + fund + m.incomes - m.expenses - m.withdrawals;

export interface MethodFigures {
  isCash: boolean;
  counted: bigint;
  pos: bigint;
}

export interface CutFigures {
  cashCounted: bigint;
  cashExpected: bigint;
  /** Diferencia por forma de pago, en el mismo orden (RF-25). */
  differences: bigint[];
  posTotal: bigint;
  salesBefore: bigint;
  salesAfter: bigint;
  expenses: bigint;
  totalDifference: bigint;
}

/** RF-25, RF-27 a RF-29. La forma de pago en efectivo usa lo contado por piezas. */
export function cutFigures(fund: bigint, methods: MethodFigures[], m: Movements): CutFigures {
  const cash = methods.find((x) => x.isCash);
  const cashCounted = cash?.counted ?? 0n;
  const cashExpected = expectedCash(cash?.pos ?? 0n, fund, m);
  const differences = methods.map((x) => (x.isCash ? x.counted - cashExpected : x.counted - x.pos));
  const others = methods.filter((x) => !x.isCash).reduce((a, x) => a + x.counted, 0n);
  const salesBefore = cashCounted - fund - m.incomes + m.expenses + m.withdrawals + others;
  return {
    cashCounted,
    cashExpected,
    differences,
    posTotal: methods.reduce((a, x) => a + x.pos, 0n),
    salesBefore,
    salesAfter: salesBefore - m.expenses - m.withdrawals,
    expenses: m.expenses,
    totalDifference: differences.reduce((a, d) => a + d, 0n),
  };
}
