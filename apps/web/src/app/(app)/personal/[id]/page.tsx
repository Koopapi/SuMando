// Spec 008: el expediente de un empleado de la sucursal activa; de otra, no existe.
import { notFound } from "next/navigation";
import { EmployeeLoans } from "@/features/payroll/employee-loans";
import { EmployeeDetail } from "@/features/personnel/employee-detail";
import { es } from "@/i18n";
import { todayInMexico } from "@/domain/personnel/documents";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { employeeLoans } from "@/server/services/payroll/loans";
import { employeeDetail } from "@/server/services/personnel/employees";
import { listPositions } from "@/server/services/personnel/positions";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.personnel.title };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { user, active } = await requirePageBranch();
  const scope = { actor: user, active };
  const ctx = appCtx();
  const { id } = await params;
  const employee = await employeeDetail(ctx, scope, id).catch((e) => {
    if (isAppError(e) && e.code === "not_found") return null;
    throw e;
  });
  if (!employee) notFound();
  const positions = (await listPositions(ctx, scope)).filter((p) => !p.archived);
  const loans = employee.owner ? await employeeLoans(ctx, scope, employee.id) : null;
  const today = todayInMexico(ctx.ports.clock.now());
  return (
    <PageShell>
      <EmployeeDetail key={`${employee.active}-${employee.periods.length}`} employee={employee} positions={positions} today={today} />
      {loans ? <EmployeeLoans employeeId={employee.id} loans={loans} today={today} /> : null}
    </PageShell>
  );
}
