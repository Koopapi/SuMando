// Spec 011 RF-30 a RF-33: el corte de caja en el teléfono de piso, si la sucursal lo permite.
import { redirect } from "next/navigation";
import { FloorCash } from "@/features/cash/floor-cash";
import { es } from "@/i18n";
import { currentFloorDevice } from "@/server/auth/checklist-actor";
import { branchSettings } from "@/server/services/cash/settings";
import { appCtx } from "@/server/app-context";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.cash.title };

export default async function Page() {
  const base = await currentFloorDevice();
  if (!base) redirect("/login");
  if (!(await branchSettings(appCtx().store, base.branch.id)).floorEnabled) redirect("/piso");
  return (
    <PageShell>
      <FloorCash />
    </PageShell>
  );
}
