// Spec 009 RF-46: semanas de nómina de la sucursal, de la más reciente a la más antigua.
import { es } from "@/i18n";
import { WeeksList } from "@/features/payroll/weeks-list";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { listPayrollWeeks } from "@/server/services/payroll/weeks";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.payroll.historyTitle };

export default async function Page() {
  const { user, active } = await requirePageBranch();
  const weeks = await listPayrollWeeks(appCtx(), { actor: user, active });
  return (
    <PageShell>
      <WeeksList weeks={weeks} />
    </PageShell>
  );
}
