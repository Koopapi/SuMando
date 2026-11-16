// Tablero (spec 012): resumen de las secciones permitidas y detalle de una, calculados al momento (RF-6).
import type { Period, PeriodInput } from "@/domain/reports/period";
import type { Ctx } from "../context";
import type { PublicUser } from "../users-public";
import { dashboardAlerts, type AlertsDetail } from "./alerts";
import { collect, moneyDetail, sectionTotal, type Figure, type MoneyDetail } from "./figures";
import { dashboardScope, periodOf, sectionOrFail, type DashboardScope, type MoneySection, type Section } from "./scope";

export interface DashboardSummary {
  owner: boolean;
  period: Period;
  sections: Section[];
  /** RF-7: el número principal de cada sección permitida. */
  alerts: number;
  figures: Partial<Record<MoneySection, Figure>>;
  hasBranches: boolean;
}

export type SectionDetail = { section: "alerts"; alerts: AlertsDetail } | (MoneyDetail & { section: MoneySection });

const moneySections = (scope: DashboardScope) => scope.sections.filter((s): s is MoneySection => s !== "alerts");

export async function dashboardSummary(ctx: Ctx, actor: PublicUser, input: PeriodInput): Promise<DashboardSummary> {
  const period = periodOf(ctx, input);
  const scope = await dashboardScope(ctx, actor);
  const [alerts, collected] = await Promise.all([dashboardAlerts(ctx, scope), collect(ctx, scope, period)]);
  const figures = Object.fromEntries(moneySections(scope).map((s) => [s, sectionTotal(scope, collected, s)]));
  return { owner: scope.owner, period, sections: scope.sections, alerts: alerts.total, figures, hasBranches: scope.branches.length > 0 };
}

export async function dashboardSection(ctx: Ctx, actor: PublicUser, rawSection: unknown, input: PeriodInput): Promise<SectionDetail> {
  const scope = await dashboardScope(ctx, actor);
  const section = sectionOrFail(scope, rawSection);
  const period = periodOf(ctx, input);
  if (section === "alerts") return { section, alerts: await dashboardAlerts(ctx, scope) };
  return moneyDetail(scope, await collect(ctx, scope, period), section) as SectionDetail;
}

/** Resumen y, si se pidió, el detalle de la sección abierta, con un solo cálculo (la página del tablero). */
export async function dashboardPage(ctx: Ctx, actor: PublicUser, input: PeriodInput, rawSection: unknown): Promise<{ summary: DashboardSummary; detail: SectionDetail | null }> {
  const period = periodOf(ctx, input);
  const scope = await dashboardScope(ctx, actor);
  const [alerts, collected] = await Promise.all([dashboardAlerts(ctx, scope), collect(ctx, scope, period)]);
  const figures = Object.fromEntries(moneySections(scope).map((s) => [s, sectionTotal(scope, collected, s)]));
  const summary: DashboardSummary = { owner: scope.owner, period, sections: scope.sections, alerts: alerts.total, figures, hasBranches: scope.branches.length > 0 };
  const section = scope.sections.includes(rawSection as Section) ? (rawSection as Section) : null;
  if (!section) return { summary, detail: null };
  const detail: SectionDetail = section === "alerts" ? { section, alerts } : (moneyDetail(scope, collected, section) as SectionDetail);
  return { summary, detail };
}
