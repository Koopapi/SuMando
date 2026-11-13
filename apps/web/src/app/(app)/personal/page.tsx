// Spec 008 RF-36, RF-37: empleados de la sucursal activa.
import { EmployeesList } from "@/features/personnel/employees-list";
import { es } from "@/i18n";
import { isOwner } from "@/domain/access/owner";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { listEmployees } from "@/server/services/personnel/employees";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.personnel.title };

export default async function Page() {
  const { user, active } = await requirePageBranch();
  const employees = await listEmployees(appCtx(), { actor: user, active });
  return (
    <PageShell>
      <EmployeesList employees={employees} owner={isOwner(user)} canCreate />
    </PageShell>
  );
}
