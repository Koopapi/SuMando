// Spec 005: registrar entrada (ver `features/inventory/movement-form.tsx`).
// Spec 015 RF-23 a RF-25, RF-34: por defecto abre el asistente; `?vista=completa|asistente` fuerza una vista y
// `?continuar=1` sigue con lo que se capturó en la otra.
import { MovementForm } from "@/features/inventory/movement-form";
import { MovementWizard } from "@/features/inventory/wizards/movement-wizard";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { movementWizardData } from "@/server/services/wizards/movement-page";
import { pageView } from "@/server/services/wizards/preferences";
import { PageHeader, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.entryTitle };

export default async function Page({ searchParams }: { searchParams: Promise<{ almacen?: string; vista?: string; continuar?: string }> }) {
  const { user, active } = await requirePageBranch();
  const ctx = appCtx();
  const data = await movementWizardData(ctx, { actor: user, active });
  const { almacen, vista, continuar } = await searchParams;
  const initialWarehouseId = data.warehouses.some((w) => w.id === almacen) ? almacen : undefined;
  if ((await pageView(ctx, user, "inv-entry", vista)) === "wizard")
    return (
      <PageShell narrow>
        <PageHeader title={es.inventory.entryTitle} />
        <MovementWizard kind="entry" data={data} initialWarehouseId={initialWarehouseId} autoResume={continuar === "1"} />
      </PageShell>
    );
  return (
    <PageShell>
      <MovementForm kind="entry" warehouses={data.warehouses} products={data.products} suppliers={data.suppliers} initialWarehouseId={initialWarehouseId} />
    </PageShell>
  );
}
