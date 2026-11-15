// Alcance del tablero (spec 012, RF-1 a RF-6): la única vista que junta negocios, siempre limitada a las sucursales
// activas de negocios activos que la persona puede ver (constitución, principio 6).
import { isOwner } from "@/domain/access/owner";
import { PeriodError, RANGE_MAX_DAYS, resolvePeriod, type Period, type PeriodInput } from "@/domain/reports/period";
import { todayInMexico } from "@/domain/personnel/documents";
import { AppError } from "../../errors";
import { accessibleFor, type ActiveBranch } from "../active-branch";
import type { Ctx } from "../context";
import type { PublicUser } from "../users-public";

export const SECTIONS = ["alerts", "sales", "expenses", "payroll", "remaining"] as const;
export type Section = (typeof SECTIONS)[number];
export type MoneySection = Exclude<Section, "alerts">;
/** RF-4: el administrador solo ve alertas y ventas. */
const ADMIN_SECTIONS: Section[] = ["alerts", "sales"];

export interface DashboardScope {
  actor: PublicUser;
  owner: boolean;
  /** Ordenadas por negocio y sucursal. */
  branches: ActiveBranch[];
  sections: Section[];
}

export async function dashboardScope(ctx: Ctx, actor: PublicUser): Promise<DashboardScope> {
  const owner = isOwner(actor);
  const branches = (await accessibleFor(ctx, actor)).sort((a, b) => a.business.name.localeCompare(b.business.name, "es") || a.branch.name.localeCompare(b.branch.name, "es"));
  return { actor, owner, branches, sections: owner ? [...SECTIONS] : ADMIN_SECTIONS };
}

/** RF-5: una sección que no le toca se rechaza; una desconocida no existe. */
export function sectionOrFail(scope: DashboardScope, raw: unknown): Section {
  if (!SECTIONS.includes(raw as Section)) throw new AppError("not_found");
  if (!scope.sections.includes(raw as Section)) throw new AppError("forbidden");
  return raw as Section;
}

/** RF-11 a RF-18 con la fecha de México del reloj del servidor. */
export function periodOf(ctx: Ctx, input: PeriodInput): Period {
  try {
    return resolvePeriod(input, todayInMexico(ctx.ports.clock.now()));
  } catch (e) {
    if (e instanceof PeriodError) throw e.code === "range_too_long" ? new AppError(e.code, { max: RANGE_MAX_DAYS }) : new AppError(e.code);
    throw e;
  }
}
