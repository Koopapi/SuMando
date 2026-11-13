// Spec 005 RF-39 a RF-41: almacén y lista de productos de un área de la sucursal activa.
import { notFound } from "next/navigation";
import { AreaProductsEditor } from "@/features/inventory/area-products-editor";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { areaSetup } from "@/server/services/inventory/counts";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.countTitle };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { user, active } = await requirePageBranch();
  const { id } = await params;
  const setup = await areaSetup(appCtx(), { actor: user, active }, id).catch((e) => {
    if (isAppError(e) && e.code === "not_found") return null;
    throw e;
  });
  if (!setup) notFound();
  return (
    <PageShell narrow>
      <AreaProductsEditor key={setup.productIds.join(",") + setup.area.warehouseId} setup={setup} />
    </PageShell>
  );
}
