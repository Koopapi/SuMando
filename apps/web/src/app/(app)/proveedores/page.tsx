// Spec 003 RF-27, RF-29 y spec 013 RF-1 a RF-3: proveedores del negocio activo con su comprador en la sucursal.
// Spec 015 RF-25, RF-27: «Nuevo proveedor» según la vista elegida; `?continuar=1` trae lo del asistente al diálogo.
import { SuppliersManager } from "@/features/catalog/suppliers-manager";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { listSupplierBuyers } from "@/server/services/catalog/supplier-buyers";
import { catalogView } from "@/server/services/catalog/views";
import { wizardView } from "@/server/services/wizards/preferences";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ continuar?: string }> }) {
  const { user, active } = await requirePageBranch();
  const scope = { actor: user, active };
  const ctx = appCtx();
  const view = await catalogView(ctx, scope);
  // Sin permiso sobre la sucursal activa no se muestra el comprador (RF-2).
  const buyers = await listSupplierBuyers(ctx, scope).catch((e) => {
    if (isAppError(e) && e.code === "forbidden") return null;
    throw e;
  });
  return (
    <PageShell>
      <SuppliersManager suppliers={view.suppliers} buyers={buyers} branchName={active.branch.name} createView={await wizardView(ctx, user, "new-supplier")} resume={(await searchParams).continuar === "1"} />
    </PageShell>
  );
}
