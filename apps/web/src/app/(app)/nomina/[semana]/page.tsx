// Spec 009: la semana de nómina de la sucursal activa, según el rol.
import { notFound } from "next/navigation";
import { WeekBoard } from "@/features/payroll/week-board";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { payrollWeek } from "@/server/services/payroll/weeks";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.payroll.title };

export default async function Page({ params }: { params: Promise<{ semana: string }> }) {
  const { user, active } = await requirePageBranch();
  const week = await payrollWeek(appCtx(), { actor: user, active }, (await params).semana).catch((e) => {
    if (isAppError(e) && e.code === "invalid_week") return null;
    throw e;
  });
  if (!week) notFound();
  return (
    <PageShell>
      <WeekBoard key={`${week.start}-${week.status}`} week={week} />
    </PageShell>
  );
}
