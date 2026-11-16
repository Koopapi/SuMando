// Cálculo de la nómina semanal (spec 009, RF-13 a RF-25), en centavos enteros: nada de punto flotante.
export type DayState = "worked" | "half";

export interface DayMark {
  state: DayState;
  late: boolean;
}

export interface LineInput {
  dailyPayCents: bigint | null;
  /** Siete posiciones, de lunes a domingo; null = vacío. */
  days: (DayMark | null)[];
  extrasCents: bigint;
  bonusCents: bigint;
  mealCents: bigint;
  loanCents: bigint;
}

export interface LineTotals {
  daysCount: number;
  halfCount: number;
  lateCount: number;
  daysCents: bigint;
  lateCents: bigint;
  extrasCents: bigint;
  bonusCents: bigint;
  mealCents: bigint;
  loanCents: bigint;
  grossCents: bigint;
  deductionsCents: bigint;
  netCents: bigint;
  /** RF-12 y RF-37: hay días marcados y no hay sueldo. */
  missingPay: boolean;
}

/** RF-18, RF-19, RF-23: la mitad del sueldo, con el medio centavo hacia arriba. */
export const halfDay = (payCents: bigint) => (payCents + 1n) / 2n;

export function lineTotals(input: LineInput): LineTotals {
  const marks = input.days.filter((d): d is DayMark => d !== null);
  const daysCount = marks.filter((d) => d.state === "worked").length;
  const halfCount = marks.filter((d) => d.state === "half").length;
  const lateCount = marks.filter((d) => d.late).length;
  const pay = input.dailyPayCents ?? 0n;
  const half = halfDay(pay);
  const daysCents = pay * BigInt(daysCount) + half * BigInt(halfCount);
  const lateCents = half * BigInt(lateCount);
  const grossCents = daysCents + input.extrasCents + input.bonusCents;
  const deductionsCents = lateCents + input.mealCents + input.loanCents;
  return {
    daysCount,
    halfCount,
    lateCount,
    daysCents,
    lateCents,
    extrasCents: input.extrasCents,
    bonusCents: input.bonusCents,
    mealCents: input.mealCents,
    loanCents: input.loanCents,
    grossCents,
    deductionsCents,
    netCents: grossCents - deductionsCents,
    missingPay: input.dailyPayCents === null && marks.length > 0,
  };
}

export interface WeekTotals {
  daysCents: bigint;
  extrasBonusCents: bigint;
  lateCents: bigint;
  mealCents: bigint;
  loanCents: bigint;
  netCents: bigint;
}

/** RF-25: total a pagar y subtotales. */
export function weekTotals(lines: Pick<LineTotals, "daysCents" | "extrasCents" | "bonusCents" | "lateCents" | "mealCents" | "loanCents" | "netCents">[]): WeekTotals {
  const sum = (f: (l: (typeof lines)[number]) => bigint) => lines.reduce((a, l) => a + f(l), 0n);
  return {
    daysCents: sum((l) => l.daysCents),
    extrasBonusCents: sum((l) => l.extrasCents + l.bonusCents),
    lateCents: sum((l) => l.lateCents),
    mealCents: sum((l) => l.mealCents),
    loanCents: sum((l) => l.loanCents),
    netCents: sum((l) => l.netCents),
  };
}
