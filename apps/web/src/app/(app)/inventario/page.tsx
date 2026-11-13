// Spec 005 RF-2, RF-55 a RF-59: existencias del almacén elegido (`?almacen=`), visibles desde la sucursal activa.
import { StockView } from "@/features/inventory/stock-view";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { inventoryWarehouses, stockOfWarehouse } from "@/server/services/inventory/stock";
import { pendingIncoming } from "@/server/services/inventory/transfers";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.title };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ almacen?: string }> }) {
  const { user, active } = await requirePageBranch();
  const scope = { actor: user, active };
  const ctx = appCtx();
  const { almacen } = await searchParams;
  const warehouses = await inventoryWarehouses(ctx, scope);
  const chosen = warehouses.find((w) => w.id === almacen) ?? warehouses.find((w) => !w.archived);
  const [stock, pending] = await Promise.all([chosen ? stockOfWarehouse(ctx, scope, chosen.id) : null, pendingIncoming(ctx, scope)]);
  return (
    <PageShell>
      <StockView warehouses={warehouses.filter((w) => !w.archived || w.id === chosen?.id)} warehouse={stock?.warehouse ?? null} rows={stock?.rows ?? []} pending={pending} />
    </PageShell>
  );
}
