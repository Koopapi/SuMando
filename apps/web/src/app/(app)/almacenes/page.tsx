// Spec 003 RF-5, RF-18, RF-19: almacenes y áreas que ve la sucursal activa.
import { PlacesManager } from "@/features/catalog/places-manager";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { catalogView } from "@/server/services/catalog/views";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const { user, active } = await requirePageBranch();
  const view = await catalogView(appCtx(), { actor: user, active });
  return (
    <PageShell>
      <PlacesManager warehouses={view.warehouses} areas={view.areas} candidates={view.candidates} branch={active.branch.name} business={active.business.name} />
    </PageShell>
  );
}
