// Spec 008 RF-10, RF-11: puestos del negocio.
import { PositionsManager } from "@/features/personnel/positions-manager";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { listPositions } from "@/server/services/personnel/positions";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.personnel.positionsTitle };

export default async function Page() {
  const { user, active } = await requirePageBranch();
  const positions = await listPositions(appCtx(), { actor: user, active });
  return (
    <PageShell narrow>
      <PositionsManager positions={positions} />
    </PageShell>
  );
}
