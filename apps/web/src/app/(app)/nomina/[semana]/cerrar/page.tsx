// Spec 015 RF-39: asistente «Cerrar la semana» de la sucursal activa (solo el dueño; a otros se les dice).
import { notFound } from "next/navigation";
import { showDate } from "@/features/personnel/dates";
import { CloseWeekWizard } from "@/features/payroll/wizards/close-week";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { payrollWeek } from "@/server/services/payroll/weeks";
import { PageHeader, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.payroll.closeWizard.title };

export default async function Page({ params, searchParams }: { params: Promise<{ semana: string }>; searchParams: Promise<{ continuar?: string }> }) {
  const { user, active } = await requirePageBranch();
  const week = await payrollWeek(appCtx(), { actor: user, active }, (await params).semana).catch((e) => {
    if (isAppError(e) && e.code === "invalid_week") return null;
    throw e;
  });
  if (!week) notFound();
  const { continuar } = await searchParams;
  return (
    <PageShell narrow>
      <PageHeader title={es.payroll.closeWizard.title} subtitle={es.payroll.weekShort(showDate(week.start), showDate(week.end))} />
      <CloseWeekWizard week={week} autoResume={continuar === "1"} />
    </PageShell>
  );
}
