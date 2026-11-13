// Spec 005 RF-22 a RF-27: enviar un traspaso desde un almacén donde se puede mover.
import { TransferForm } from "@/features/inventory/transfer-form";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { movementFormData } from "@/server/services/inventory/forms";
import { transferDestinations } from "@/server/services/inventory/transfers";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.transferTitle };

export default async function Page({ searchParams }: { searchParams: Promise<{ almacen?: string }> }) {
  const { user, active } = await requirePageBranch();
  const scope = { actor: user, active };
  const ctx = appCtx();
  const [data, destinations] = await Promise.all([movementFormData(ctx, scope), transferDestinations(ctx, scope)]);
  const { almacen } = await searchParams;
  return (
    <PageShell>
      <TransferForm warehouses={data.warehouses} destinations={destinations} products={data.products} initialWarehouseId={data.warehouses.some((w) => w.id === almacen) ? almacen : undefined} />
    </PageShell>
  );
}
