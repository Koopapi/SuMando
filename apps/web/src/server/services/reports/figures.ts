// Cifras del tablero (spec 012, RF-21 a RF-36): ventas, gastos de caja, nómina y lo que queda, calculadas al momento
// (RF-6) desde los cortes cerrados y las semanas cerradas de las sucursales del alcance.
import type { CashCut } from "@/db/schema";
import { cutFigures, piecesTotal, sumMovements } from "@/domain/cash/calc";
import { compare, weekInPeriod, type Period } from "@/domain/reports/period";
import { addDays } from "@/domain/payroll/week";
import type { BusinessColor } from "@/domain/business-color";
import { logoVersion } from "../business-logo";
import { moneyText } from "../payroll/weeks";
import type { Ctx } from "../context";
import type { DashboardScope, MoneySection } from "./scope";

export interface Figure {
  amount: string;
  previous: string;
  change: string;
  percent: string | null;
  direction: "up" | "down" | "same";
}

export interface FigureRow {
  id: string;
  name: string;
  figure: Figure;
}

export interface BusinessRow extends FigureRow {
  color: BusinessColor;
  /** Spec 014, RF-29. */
  logoVersion: string | null;
  branches: FigureRow[];
}

export interface MoneyDetail {
  section: MoneySection;
  total: Figure;
  businesses: BusinessRow[];
  /** RF-27. */
  methods?: FigureRow[];
  /** RF-30. */
  expenses?: { id: string; date: string; business: string; branch: string; concept: string; amount: string }[];
  /** RF-34. */
  weeks?: { id: string; weekStart: string; business: string; branch: string; total: string }[];
}

interface Pair {
  cur: bigint;
  prev: bigint;
}
const zero = (): Pair => ({ cur: 0n, prev: 0n });
const add = (p: Pair, which: "cur" | "prev", v: bigint) => {
  p[which] += v;
};

export const figureOf = (p: Pair): Figure => {
  const c = compare(p.cur, p.prev);
  return { amount: moneyText(p.cur), previous: moneyText(p.prev), change: moneyText(c.change), percent: c.percent, direction: c.direction };
};

interface BranchTotals {
  sales: Pair;
  expenses: Pair;
  payroll: Pair;
}

export interface Collected {
  byBranch: Map<string, BranchTotals>;
  methods: Map<string, Pair>;
  expenseList: NonNullable<MoneyDetail["expenses"]>;
  weekList: NonNullable<MoneyDetail["weeks"]>;
}

const within = (date: string, from: string, to: string) => from <= date && date <= to;

/** Recorre una sola vez los cortes y semanas del periodo y del anterior. */
export async function collect(ctx: Ctx, scope: DashboardScope, period: Period): Promise<Collected> {
  const byBranch = new Map<string, BranchTotals>(scope.branches.map((b) => [b.branch.id, { sales: zero(), expenses: zero(), payroll: zero() }]));
  const methods = new Map<string, Pair>();
  const expenseList: Collected["expenseList"] = [];
  const weekList: Collected["weekList"] = [];
  const which = (date: string): "cur" | "prev" | null => (within(date, period.from, period.to) ? "cur" : within(date, period.prevFrom, period.prevTo) ? "prev" : null);
  const branchOf = new Map(scope.branches.map((b) => [b.branch.id, b]));

  const cutLists = await Promise.all(scope.branches.map((b) => ctx.store.cash.cuts.listByBranch(b.branch.id)));
  // RF-26, RF-28: solo cortes cerrados, por su fecha de apertura.
  const cuts: CashCut[] = cutLists.flat().filter((c) => c.status === "closed" && which(c.date) !== null);
  const ids = cuts.map((c) => c.id);
  const [cutMethods, movements] = ids.length ? await Promise.all([ctx.store.cash.cutMethods.listByCuts(ids), ctx.store.cash.movements.listByCuts(ids)]) : [[], []];
  const methodsOf = Map.groupBy(cutMethods, (m) => m.cutId);
  const movesOf = Map.groupBy(movements, (m) => m.cutId);
  for (const cut of cuts) {
    const w = which(cut.date)!;
    const totals = byBranch.get(cut.branchId)!;
    const moves = movesOf.get(cut.id) ?? [];
    const ms = (methodsOf.get(cut.id) ?? []).sort((a, b) => a.sort - b.sort);
    const m = sumMovements(moves.map((x) => ({ kind: x.kind, amountCents: x.amountCents, cancelled: x.cancelledAt !== null })));
    const cash = cut.cashPieces ? piecesTotal(cut.cashPieces) : 0n;
    const f = cutFigures(cut.openingFundCents, ms.map((x) => ({ isCash: x.isCash, counted: x.isCash ? cash : (x.countedCents ?? 0n), pos: x.posCents ?? 0n })), m);
    add(totals.sales, w, f.salesBefore); // RF-25
    add(totals.expenses, w, m.expenses); // RF-29
    for (const x of ms) {
      // La venta en efectivo descuenta el fondo y los ingresos, y devuelve lo que salió del cajón (spec 011, RF-27).
      const sale = x.isCash ? cash - cut.openingFundCents - m.incomes + m.expenses + m.withdrawals : (x.countedCents ?? 0n);
      const pair = methods.get(x.name) ?? zero();
      add(pair, w, sale);
      methods.set(x.name, pair);
    }
    if (w === "cur") {
      const b = branchOf.get(cut.branchId)!;
      for (const x of moves) if (x.kind === "expense" && !x.cancelledAt) expenseList.push({ id: x.id, date: cut.date, business: b.business.name, branch: b.branch.name, concept: x.concept, amount: moneyText(x.amountCents) });
    }
  }
  // RF-31 a RF-33: semanas cerradas, en el periodo de su domingo.
  const weekLists = await Promise.all(scope.branches.map((b) => ctx.store.payroll.weeks.listByBranch(b.branch.id)));
  for (const week of weekLists.flat()) {
    if (week.status !== "closed") continue;
    const w = weekInPeriod(week.weekStart, period.from, period.to) ? "cur" : weekInPeriod(week.weekStart, period.prevFrom, period.prevTo) ? "prev" : null;
    if (!w) continue;
    const total = week.totalCents ?? 0n;
    add(byBranch.get(week.branchId)!.payroll, w, total);
    if (w === "cur") {
      const b = branchOf.get(week.branchId)!;
      weekList.push({ id: week.id, weekStart: week.weekStart, business: b.business.name, branch: b.branch.name, total: moneyText(total) });
    }
  }
  expenseList.sort((a, b) => b.date.localeCompare(a.date));
  weekList.sort((a, b) => b.weekStart.localeCompare(a.weekStart) || a.business.localeCompare(b.business, "es"));
  return { byBranch, methods, expenseList, weekList };
}

/** RF-35: lo que queda = ventas − gastos − nómina. */
function pairFor(t: BranchTotals, section: MoneySection): Pair {
  if (section === "remaining") return { cur: t.sales.cur - t.expenses.cur - t.payroll.cur, prev: t.sales.prev - t.expenses.prev - t.payroll.prev };
  return section === "sales" ? t.sales : section === "expenses" ? t.expenses : t.payroll;
}

const sum = (pairs: Pair[]): Pair => pairs.reduce((a, p) => ({ cur: a.cur + p.cur, prev: a.prev + p.prev }), zero());

export function sectionTotal(scope: DashboardScope, c: Collected, section: MoneySection): Figure {
  return figureOf(sum(scope.branches.map((b) => pairFor(c.byBranch.get(b.branch.id)!, section))));
}

/** RF-21 a RF-24: total arriba, una fila por negocio y, dentro, una por sucursal, con ceros incluidos. */
export function moneyDetail(scope: DashboardScope, c: Collected, section: MoneySection): MoneyDetail {
  const businesses: BusinessRow[] = [];
  for (const { branch, business } of scope.branches) {
    let row = businesses.find((b) => b.id === business.id);
    if (!row) {
      row = { id: business.id, name: business.name, color: business.color as BusinessColor, logoVersion: logoVersion(business), figure: figureOf(zero()), branches: [] };
      businesses.push(row);
    }
    row.branches.push({ id: branch.id, name: branch.name, figure: figureOf(pairFor(c.byBranch.get(branch.id)!, section)) });
  }
  for (const row of businesses) row.figure = figureOf(sum(scope.branches.filter((b) => b.business.id === row.id).map((b) => pairFor(c.byBranch.get(b.branch.id)!, section))));
  const detail: MoneyDetail = { section, total: sectionTotal(scope, c, section), businesses };
  if (section === "sales") detail.methods = [...c.methods.entries()].map(([name, p]) => ({ id: name, name, figure: figureOf(p) })).sort((a, b) => a.name.localeCompare(b.name, "es"));
  if (section === "expenses") detail.expenses = c.expenseList;
  if (section === "payroll") detail.weeks = c.weekList;
  return detail;
}

export const sundayOf = (monday: string) => addDays(monday, 6);
