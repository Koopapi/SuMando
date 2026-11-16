// Semana en Excel (spec 009, RF-45): una fila por empleado con sus columnas y una fila de totales (solo el dueño).
import { weekTotals } from "@/domain/payroll/calc";
import { es } from "@/i18n";
import { Num, writeWorkbook, type Cell } from "../../adapters/xlsx-writer";
import type { CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { moneyText, payrollWeekForOwner } from "./weeks";

const t = es.payroll;

export async function payrollWeekExcel(ctx: Ctx, scope: CatalogScope, rawMonday: unknown): Promise<{ fileName: string; bytes: Buffer }> {
  const { view, people } = await payrollWeekForOwner(ctx, scope, rawMonday);
  const money = (c: bigint) => new Num(moneyText(c));
  const ordered = view.groups.flatMap((g) => g.rows).map((r) => people.find((p) => p.employee.id === r.employeeId)!);
  const rows: Cell[][] = [[...t.excelHeaders]];
  for (const p of ordered) {
    const x = p.totals;
    rows.push([p.employee.name, p.position, x.daysCount, x.halfCount, x.lateCount, p.pay === null ? null : money(p.pay), money(x.daysCents), money(x.extrasCents), money(x.bonusCents), p.line?.bonusConcept ?? null, money(x.lateCents), money(x.mealCents), money(x.loanCents), money(x.netCents)]);
  }
  const sum = weekTotals(people.map((p) => p.totals));
  const count = (f: (p: (typeof people)[number]) => number) => people.reduce((a, p) => a + f(p), 0);
  const bonus = people.reduce((a, p) => a + p.totals.bonusCents, 0n);
  rows.push([t.excelTotals, null, count((p) => p.totals.daysCount), count((p) => p.totals.halfCount), count((p) => p.totals.lateCount), null, money(sum.daysCents), money(sum.extrasBonusCents - bonus), money(bonus), null, money(sum.lateCents), money(sum.mealCents), money(sum.loanCents), money(sum.netCents)]);
  const slug = scope.active.branch.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { fileName: t.excelFile(slug || "sucursal", view.start), bytes: writeWorkbook(t.excelSheet(view.start), rows) };
}
