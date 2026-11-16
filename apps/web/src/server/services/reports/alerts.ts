// Alertas del tablero (spec 012, RF-37 a RF-46, RF-50): su estado al momento, sin importar el periodo (RF-38).
import { cutFigures, piecesTotal, sumMovements } from "@/domain/cash/calc";
import { dbToMicro, formatMilli, fromBaseMicro } from "@/domain/catalog/units";
import { dbToSignedMicro, formatStock } from "@/domain/inventory/quantities";
import { weekOverlapsPeriods } from "@/domain/payroll/week";
import { todayInMexico } from "@/domain/personnel/documents";
import { cutHasDifference, unclosedWeeks } from "@/domain/reports/alerts";
import type { BusinessColor } from "@/domain/business-color";
import type { Ctx } from "../context";
import { countFactor, loadBook } from "../inventory/shared";
import { moneyText } from "../payroll/weeks";
import type { DashboardScope } from "./scope";

export const ALERT_KINDS = ["low_stock", "requisition", "payroll", "cash_difference"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

interface AlertBase {
  id: string;
  businessId: string;
  business: string;
  color: BusinessColor;
  /** Null: almacén del negocio completo. */
  branch: string | null;
  /** Sucursal que se activa al abrir la alerta (RF-46). */
  targetBranchId: string;
  href: string;
}

export type AlertView = AlertBase &
  (
    | { kind: "low_stock"; product: string; warehouse: string; quantity: string; min: string; presentation: string | null; baseUnit: string; negative: boolean }
    | { kind: "requisition"; folio: number; status: "requested" | "approved"; date: string }
    | { kind: "payroll"; weekStart: string }
    | { kind: "cash_difference"; date: string; difference: string }
  );

export interface AlertsDetail {
  total: number;
  counts: Record<AlertKind, number>;
  items: AlertView[];
}

const REQUISITION_LIMIT = 500;

export async function dashboardAlerts(ctx: Ctx, scope: DashboardScope): Promise<AlertsDetail> {
  const today = todayInMexico(ctx.ports.clock.now());
  const items: AlertView[] = [];
  const businesses = new Map(scope.branches.map((b) => [b.business.id, b.business]));
  const base = (businessId: string, branchId: string | null, href: string) => {
    const business = businesses.get(businessId)!;
    const target = scope.branches.find((b) => (branchId ? b.branch.id === branchId : b.business.id === businessId))!;
    return { businessId, business: business.name, color: business.color as BusinessColor, branch: branchId ? target.branch.name : null, targetBranchId: target.branch.id, href };
  };
  const branchIds = new Set(scope.branches.map((b) => b.branch.id));

  // RF-39, RF-40: existencias bajo el mínimo en almacenes activos del alcance, productos activos.
  for (const businessId of businesses.keys()) {
    const [warehouses, levels, book] = await Promise.all([ctx.store.catalog.warehouses.listByBusiness(businessId), ctx.store.catalog.levels.listByBusiness(businessId), loadBook(ctx.store, businessId)]);
    const visible = warehouses.filter((w) => !w.archivedAt && (w.branchId === null || branchIds.has(w.branchId)));
    const stock = await ctx.store.inventory.stock.listByWarehouses(visible.map((w) => w.id));
    const qty = new Map(stock.map((s) => [`${s.warehouseId}:${s.productId}`, dbToSignedMicro(s.quantityBase)]));
    for (const w of visible) {
      for (const l of levels) {
        if (l.warehouseId !== w.id || l.minBase === null) continue;
        const product = book.products.get(l.productId);
        if (!product || product.archivedAt) continue;
        const q = qty.get(`${w.id}:${product.id}`) ?? 0n;
        const min = dbToMicro(l.minBase);
        if (q >= min) continue;
        const { name: presentation, factorMilli } = countFactor(book, product);
        items.push({
          kind: "low_stock",
          id: `low_stock:${w.id}:${product.id}`,
          ...base(businessId, w.branchId, `/inventario?almacen=${w.id}`),
          product: product.name,
          warehouse: w.name,
          quantity: formatStock(q, factorMilli),
          min: formatMilli(fromBaseMicro(min, factorMilli)),
          presentation,
          baseUnit: product.baseUnit,
          negative: q < 0n,
        });
      }
    }
  }

  for (const { branch, business } of scope.branches) {
    // RF-41, RF-42: solicitadas por aprobar y aprobadas con renglones por recibir (al recibir todo se cierran).
    const [requested, approved] = await Promise.all([ctx.store.requisitions.requisitions.listByBranch(branch.id, "requested", REQUISITION_LIMIT), ctx.store.requisitions.requisitions.listByBranch(branch.id, "approved", REQUISITION_LIMIT)]);
    for (const r of [...requested, ...approved]) items.push({ kind: "requisition", id: `requisition:${r.id}`, ...base(business.id, branch.id, `/requisiciones/${r.id}`), folio: r.folio, status: r.status as "requested" | "approved", date: todayInMexico(r.createdAt) });

    // RF-43: semanas terminadas sin cerrar desde la primera captura, con personal con sueldo.
    const weeks = await ctx.store.payroll.weeks.listByBranch(branch.id);
    if (weeks.length) {
      const employees = (await ctx.store.personnel.employees.listByBranch(branch.id)).filter((e) => e.dailyPayCents !== null);
      const periods = await ctx.store.personnel.periods.listByEmployees(employees.map((e) => e.id));
      const firstMonday = weeks.reduce((m, w) => (w.weekStart < m ? w.weekStart : m), weeks[0].weekStart);
      const closed = new Set(weeks.filter((w) => w.status === "closed").map((w) => w.weekStart));
      for (const monday of unclosedWeeks({ today, firstMonday, closed, staffed: (m) => weekOverlapsPeriods(m, periods) }))
        items.push({ kind: "payroll", id: `payroll:${branch.id}:${monday}`, ...base(business.id, branch.id, `/nomina/${monday}`), weekStart: monday });
    }

    // RF-44: cortes cerrados con cualquier diferencia, sin marca de revisado.
    const cuts = (await ctx.store.cash.cuts.listByBranch(branch.id)).filter((c) => c.status === "closed" && !c.reviewedAt);
    if (cuts.length) {
      const ids = cuts.map((c) => c.id);
      const [methods, movements] = await Promise.all([ctx.store.cash.cutMethods.listByCuts(ids), ctx.store.cash.movements.listByCuts(ids)]);
      for (const cut of cuts) {
        const ms = methods.filter((m) => m.cutId === cut.id).sort((a, b) => a.sort - b.sort);
        const m = sumMovements(movements.filter((x) => x.cutId === cut.id).map((x) => ({ kind: x.kind, amountCents: x.amountCents, cancelled: x.cancelledAt !== null })));
        const cash = cut.cashPieces ? piecesTotal(cut.cashPieces) : 0n;
        const f = cutFigures(cut.openingFundCents, ms.map((x) => ({ isCash: x.isCash, counted: x.isCash ? cash : (x.countedCents ?? 0n), pos: x.posCents ?? 0n })), m);
        if (cutHasDifference(f.differences)) items.push({ kind: "cash_difference", id: `cash_difference:${cut.id}`, ...base(business.id, branch.id, `/caja/${cut.id}`), date: cut.date, difference: moneyText(f.totalDifference) });
      }
    }
  }

  const order = (k: AlertKind) => ALERT_KINDS.indexOf(k);
  items.sort((a, b) => order(a.kind) - order(b.kind) || a.business.localeCompare(b.business, "es") || (a.branch ?? "").localeCompare(b.branch ?? "", "es"));
  const counts = Object.fromEntries(ALERT_KINDS.map((k) => [k, items.filter((i) => i.kind === k).length])) as Record<AlertKind, number>;
  return { total: items.length, counts, items };
}
