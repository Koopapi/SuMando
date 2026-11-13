// Spec 003 RF-27, RF-29: proveedores del negocio activo.
import { SuppliersManager } from "@/features/catalog/suppliers-manager";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { catalogView } from "@/server/services/catalog/views";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const { user, active } = await requirePageBranch();
  const view = await catalogView(appCtx(), { actor: user, active });
  return (
    <PageShell>
      <SuppliersManager suppliers={view.suppliers} />
    </PageShell>
  );
}
