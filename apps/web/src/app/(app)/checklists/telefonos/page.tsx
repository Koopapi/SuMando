// Spec 010 RF-37, RF-43, RF-44: teléfonos de piso de la sucursal activa.
import { DevicesManager } from "@/features/checklists/devices-manager";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { listFloorDevices } from "@/server/services/checklists/floor";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.checklists.devicesTitle };

export default async function Page() {
  const { user, active } = await requirePageBranch();
  return (
    <PageShell>
      <DevicesManager devices={await listFloorDevices(appCtx(), { actor: user, active })} />
    </PageShell>
  );
}
