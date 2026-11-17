// Spec 013 RF-17 a RF-23 y RF-33: «Datos de compra» del almacén elegido (`?almacen=`).
import { PurchaseData } from "@/features/inventory/purchase-data";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { purchaseData } from "@/server/services/catalog/purchase-data";
import { builderData } from "@/server/services/requisitions/requisitions";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.purchaseData.title };

export default async function PurchaseDataPage({ searchParams }: { searchParams: Promise<{ almacen?: string }> }) {
  const { user, active } = await requirePageBranch();
  const scope = { actor: user, active };
  const ctx = appCtx();
  const { almacen } = await searchParams;
  // Los mismos almacenes donde se puede armar una requisición: activos y con permiso de movimientos (RF-23).
  const { warehouses } = await builderData(ctx, scope);
  const chosen = warehouses.find((w) => w.id === almacen) ?? warehouses[0];
  const view = chosen ? await purchaseData(ctx, scope, chosen.id) : null;
  return (
    <PageShell>
      <PurchaseData warehouses={warehouses} view={view} />
    </PageShell>
  );
}
