// Spec 008 RF-9 a RF-13: alta de un empleado en la sucursal activa.
import { EmployeeForm } from "@/features/personnel/employee-form";
import { es } from "@/i18n";
import { isOwner } from "@/domain/access/owner";
import { todayInMexico } from "@/domain/personnel/documents";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { listPositions } from "@/server/services/personnel/positions";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.personnel.newTitle };

export default async function Page() {
  const { user, active } = await requirePageBranch();
  const ctx = appCtx();
  const positions = (await listPositions(ctx, { actor: user, active })).filter((p) => !p.archived);
  return (
    <PageShell narrow>
      <EmployeeForm positions={positions} owner={isOwner(user)} today={todayInMexico(ctx.ports.clock.now())} />
    </PageShell>
  );
}
