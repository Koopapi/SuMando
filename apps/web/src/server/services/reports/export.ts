// Excel de la sección abierta del tablero (spec 012, RF-51 a RF-54): solo lo que quien exporta puede ver.
import { es } from "@/i18n";
import { addDays } from "@/domain/payroll/week";
import { Num, writeWorkbook, type Cell } from "../../adapters/xlsx-writer";
import type { Ctx } from "../context";
import type { PublicUser } from "../users-public";
import type { PeriodInput } from "@/domain/reports/period";
import { dashboardSection } from "./dashboard";
import type { AlertView } from "./alerts";
import type { Figure } from "./figures";
import { periodOf } from "./scope";
import { documentLogo } from "../business-logo";

const t = es.dashboard;
const num = (amount: string) => new Num(amount);
const pct = (f: Figure): Cell => (f.percent === null ? t.noPrevious : new Num(f.percent));
const figureCells = (f: Figure): Cell[] => [num(f.amount), num(f.previous), num(f.change), pct(f)];

function alertRow(a: AlertView): Cell[] {
  const place: Cell[] = [t.alertKinds[a.kind], a.business, a.branch ?? t.wholeBusiness];
  switch (a.kind) {
    case "low_stock":
      return [...place, t.lowStockTitle(a.product, a.warehouse), t.lowStockDetail(a.quantity, a.min, a.presentation ?? es.catalog.unitShort[a.baseUnit])];
    case "requisition":
      return [...place, t.requisitionTitle(a.folio), t.requisitionDetail(a.status, a.date)];
    case "payroll":
      return [...place, t.payrollTitle(a.weekStart, addDays(a.weekStart, 6)), t.payrollDetail];
    case "cash_difference":
      return [...place, t.cashTitle(a.date), t.cashDetail(a.difference)];
  }
}

export async function dashboardExcel(ctx: Ctx, actor: PublicUser, rawSection: unknown, input: PeriodInput): Promise<{ fileName: string; bytes: Buffer }> {
  const detail = await dashboardSection(ctx, actor, rawSection, input);
  const period = periodOf(ctx, input);
  const name = t.sections[detail.section];
  const rows: Cell[][] = [[name], [t.excelPeriod(period.from, period.to)]];
  if (detail.section === "alerts") {
    rows.push([], t.excelAlertHeaders, ...detail.alerts.items.map(alertRow));
  } else {
    rows.push([t.excelPrevious(period.prevFrom, period.prevTo)], [], t.excelMoneyHeaders, [t.total, t.excelAll, ...figureCells(detail.total)]);
    for (const b of detail.businesses) {
      rows.push([b.name, t.excelAll, ...figureCells(b.figure)]);
      for (const br of b.branches) rows.push([b.name, br.name, ...figureCells(br.figure)]);
    }
    if (detail.methods?.length) rows.push([], [t.byMethod], t.excelMethodHeaders, ...detail.methods.map((m) => [m.name, ...figureCells(m.figure)]));
    if (detail.expenses) rows.push([], [t.expensesList], t.excelExpenseHeaders, ...detail.expenses.map((e) => [e.date, e.business, e.branch, e.concept, num(e.amount)]));
    if (detail.weeks) rows.push([], [t.weeksList], t.excelWeekHeaders, ...detail.weeks.map((w) => [t.periodLine(w.weekStart, addDays(w.weekStart, 6)), w.business, w.branch, num(w.total)]));
  }
  // Spec 014, RF-32: con el logo solo cuando el libro es de un negocio.
  const ids = new Set(detail.section === "alerts" ? detail.alerts.items.map((a) => a.businessId) : detail.businesses.map((b) => b.id));
  const logo = ids.size === 1 ? await documentLogo(ctx, [...ids][0]) : null;
  return { fileName: t.excelFile(detail.section, period.from, period.to), bytes: writeWorkbook(t.excelSheet(name), rows, { logo }) };
}
