// Spec 006: importar la hoja «Inventario por áreas» en un almacén donde se puede mover.
import { InventoryImport } from "@/features/inventory/inventory-import";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { movementFormData } from "@/server/services/inventory/forms";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.importer.title };

export default async function Page() {
  const { user, active } = await requirePageBranch();
  const { warehouses } = await movementFormData(appCtx(), { actor: user, active });
  return (
    <PageShell>
      <InventoryImport warehouses={warehouses} />
    </PageShell>
  );
}
