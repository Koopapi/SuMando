// Spec 008 RF-9 a RF-13: alta de un empleado en la sucursal activa.
// Spec 015 RF-23 a RF-25, RF-46: por defecto abre el asistente «Nuevo empleado»; `?vista=completa|asistente` fuerza
// una vista y `?continuar=1` sigue con lo que se capturó en la otra.
import { EmployeeForm } from "@/features/personnel/employee-form";
import { NewEmployeeWizard } from "@/features/personnel/wizards/new-employee";
import { es } from "@/i18n";
import { isOwner } from "@/domain/access/owner";
import { todayInMexico } from "@/domain/personnel/documents";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { listDocumentTypes } from "@/server/services/personnel/document-types";
import { listPositions } from "@/server/services/personnel/positions";
import { pageView } from "@/server/services/wizards/preferences";
import { PageHeader, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.personnel.newTitle };

export default async function Page({ searchParams }: { searchParams: Promise<{ vista?: string; continuar?: string }> }) {
  const { user, active } = await requirePageBranch();
  const ctx = appCtx();
  const scope = { actor: user, active };
  const positions = (await listPositions(ctx, scope)).filter((p) => !p.archived);
  const today = todayInMexico(ctx.ports.clock.now());
  const { vista, continuar } = await searchParams;
  if ((await pageView(ctx, user, "new-employee", vista)) === "wizard")
    return (
      <PageShell narrow>
        <PageHeader title={es.personnel.newTitle} subtitle={es.personnel.newIntro} />
        <NewEmployeeWizard positions={positions} documentTypes={await listDocumentTypes(ctx, scope)} owner={isOwner(user)} today={today} autoResume={continuar === "1"} />
      </PageShell>
    );
  return (
    <PageShell narrow>
      <EmployeeForm positions={positions} owner={isOwner(user)} today={today} />
    </PageShell>
  );
}
