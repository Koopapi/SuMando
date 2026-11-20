// Spec 005 RF-22 a RF-27: enviar un traspaso desde un almacén donde se puede mover.
// Spec 015 RF-23 a RF-25, RF-36: por defecto abre el asistente «Traspaso»; `?vista=completa|asistente` fuerza una
// vista y `?continuar=1` sigue con lo que se capturó en la otra.
import { TransferForm } from "@/features/inventory/transfer-form";
import { MovementWizard } from "@/features/inventory/wizards/movement-wizard";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { transferDestinations } from "@/server/services/inventory/transfers";
import { movementWizardData } from "@/server/services/wizards/movement-page";
import { pageView } from "@/server/services/wizards/preferences";
import { PageHeader, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.transferTitle };

export default async function Page({ searchParams }: { searchParams: Promise<{ almacen?: string; vista?: string; continuar?: string }> }) {
  const { user, active } = await requirePageBranch();
  const scope = { actor: user, active };
  const ctx = appCtx();
  const [data, destinations] = await Promise.all([movementWizardData(ctx, scope), transferDestinations(ctx, scope)]);
  const { almacen, vista, continuar } = await searchParams;
  const initialWarehouseId = data.warehouses.some((w) => w.id === almacen) ? almacen : undefined;
  if ((await pageView(ctx, user, "inv-transfer", vista)) === "wizard")
    return (
      <PageShell narrow>
        <PageHeader title={es.inventory.transferTitle} />
        <MovementWizard kind="transfer" data={data} destinations={destinations} initialWarehouseId={initialWarehouseId} autoResume={continuar === "1"} />
      </PageShell>
    );
  return (
    <PageShell>
      <TransferForm warehouses={data.warehouses} destinations={destinations} products={data.products} initialWarehouseId={initialWarehouseId} />
    </PageShell>
  );
}
