// Spec 003 RF-4, RF-39 a RF-41: productos del negocio de la sucursal activa.
// Spec 015 RF-25, RF-27: «Nuevo producto» según la vista elegida; `?continuar=1` trae lo del asistente al diálogo.
import { ProductsManager } from "@/features/catalog/products-manager";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { catalogView } from "@/server/services/catalog/views";
import { wizardView } from "@/server/services/wizards/preferences";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ continuar?: string }> }) {
  const { user, active } = await requirePageBranch();
  const ctx = appCtx();
  const view = await catalogView(ctx, { actor: user, active });
  const { continuar } = await searchParams;
  return (
    <PageShell>
      <ProductsManager products={view.products} suppliers={view.suppliers} warehouses={view.warehouses} createView={await wizardView(ctx, user, "new-product")} resume={continuar === "1"} />
    </PageShell>
  );
}
