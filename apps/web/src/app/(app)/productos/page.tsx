// Spec 003 RF-4, RF-39 a RF-41: productos del negocio de la sucursal activa.
import { ProductsManager } from "@/features/catalog/products-manager";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { catalogView } from "@/server/services/catalog/views";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { user, active } = await requirePageBranch();
  const view = await catalogView(appCtx(), { actor: user, active });
  return (
    <PageShell>
      <ProductsManager products={view.products} suppliers={view.suppliers} warehouses={view.warehouses} />
    </PageShell>
  );
}
