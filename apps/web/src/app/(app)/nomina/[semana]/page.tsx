// Spec 009: la semana de nómina de la sucursal activa, según el rol.
// Spec 015 RF-23 a RF-25, RF-38: con la semana abierta, por defecto abre el asistente «Asistencia de la semana»;
// `?vista=completa|asistente` fuerza una vista y `?continuar=1` sigue con lo que se capturó en la otra.
import { notFound } from "next/navigation";
import { WeekBoard } from "@/features/payroll/week-board";
import { AttendanceWizard } from "@/features/payroll/wizards/attendance";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { payrollWeek } from "@/server/services/payroll/weeks";
import { pageView, wizardView } from "@/server/services/wizards/preferences";
import { PageHeader, PageShell } from "@/ui";
import { showDate } from "@/features/personnel/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: es.payroll.title };

export default async function Page({ params, searchParams }: { params: Promise<{ semana: string }>; searchParams: Promise<{ vista?: string; continuar?: string }> }) {
  const { user, active } = await requirePageBranch();
  const ctx = appCtx();
  const week = await payrollWeek(ctx, { actor: user, active }, (await params).semana).catch((e) => {
    if (isAppError(e) && e.code === "invalid_week") return null;
    throw e;
  });
  if (!week) notFound();
  const { vista, continuar } = await searchParams;
  if (week.status === "open" && (await pageView(ctx, user, "pay-attendance", vista)) === "wizard")
    return (
      <PageShell narrow>
        <PageHeader title={es.payroll.attendanceWizard.title} subtitle={es.payroll.weekShort(showDate(week.start), showDate(week.end))} />
        <AttendanceWizard week={week} autoResume={continuar === "1"} />
      </PageShell>
    );
  return (
    <PageShell>
      <WeekBoard key={`${week.start}-${week.status}`} week={week} closeView={week.owner ? await wizardView(ctx, user, "pay-close") : "full"} />
    </PageShell>
  );
}
