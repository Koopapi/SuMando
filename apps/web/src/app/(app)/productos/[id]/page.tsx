// Spec 003: detalle de un producto del negocio activo; de otro negocio, no existe (RF-8).
import { notFound } from "next/navigation";
import { ProductDetail } from "@/features/catalog/product-detail";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { productDetail } from "@/server/services/catalog/views";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, active } = await requirePageBranch();
  const { id } = await params;
  const found = /^[0-9a-f-]{36}$/i.test(id) ? await productDetail(appCtx(), { actor: user, active }, id) : null;
  if (!found) notFound();
  return (
    <PageShell>
      <ProductDetail product={found.product} suppliers={found.catalog.suppliers} warehouses={found.catalog.warehouses} />
    </PageShell>
  );
}
