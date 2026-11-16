// Spec 009 RF-41 a RF-44: hoja de pago de la semana (solo el dueño; para el administrador no existe).
import { notFound } from "next/navigation";
import { cashBreakdown, sumBreakdowns } from "@/domain/payroll/cash";
import { PaySheet, serialCash } from "@/features/payroll/pay-sheet";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { payrollWeekForOwner } from "@/server/services/payroll/weeks";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.payroll.paySheet };

export default async function Page({ params }: { params: Promise<{ semana: string }> }) {
  const { user, active } = await requirePageBranch();
  const data = await payrollWeekForOwner(appCtx(), { actor: user, active }, (await params).semana).catch((e) => {
    if (isAppError(e) && (e.code === "invalid_week" || e.code === "owner_only")) return null;
    throw e;
  });
  if (!data) notFound();
  const rows = data.view.groups.flatMap((g) => g.rows);
  const breakdowns = Object.fromEntries(data.people.map((p) => [p.employee.id, cashBreakdown(p.totals.netCents)]));
  const cash = Object.fromEntries(Object.entries(breakdowns).map(([id, b]) => [id, serialCash(b)]));
  return (
    <PageShell>
      <PaySheet start={data.view.start} end={data.view.end} total={data.view.totals!.net} rows={rows} cash={cash} totalCash={serialCash(sumBreakdowns(Object.values(breakdowns)))} />
    </PageShell>
  );
}
