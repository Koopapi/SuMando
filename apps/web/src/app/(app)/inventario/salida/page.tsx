// Spec 005: registrar salida (ver `features/inventory/movement-form.tsx`).
import { MovementForm } from "@/features/inventory/movement-form";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { movementFormData } from "@/server/services/inventory/forms";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.exitTitle };

export default async function Page({ searchParams }: { searchParams: Promise<{ almacen?: string }> }) {
  const { user, active } = await requirePageBranch();
  const data = await movementFormData(appCtx(), { actor: user, active });
  const { almacen } = await searchParams;
  return (
    <PageShell>
      <MovementForm kind="exit" warehouses={data.warehouses} products={data.products} suppliers={data.suppliers} initialWarehouseId={data.warehouses.some((w) => w.id === almacen) ? almacen : undefined} />
    </PageShell>
  );
}
