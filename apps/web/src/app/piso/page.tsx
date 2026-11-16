// Spec 010 RF-38, RF-40: inicio del teléfono de piso. Sin un teléfono habilitado, a la entrada.
import { redirect } from "next/navigation";
import { todayInMexico } from "@/domain/personnel/documents";
import { FloorHome } from "@/features/checklists/floor";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { currentFloorDevice } from "@/server/auth/checklist-actor";
import { branchSettings } from "@/server/services/cash/settings";
import { floorEmployees } from "@/server/services/checklists/floor";
import { todayChecklists } from "@/server/services/checklists/sheets";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.checklists.floorTitle };

export default async function Page() {
  const base = await currentFloorDevice();
  if (!base) redirect("/login");
  const ctx = appCtx();
  const [employees, items, cash] = await Promise.all([floorEmployees(ctx, base.branch.id, base.business.id), todayChecklists(ctx, { kind: "device", ...base, employee: null }), branchSettings(ctx.store, base.branch.id)]);
  return (
    <PageShell>
      <FloorHome device={base.device.name} employees={employees} today={todayInMexico(ctx.ports.clock.now())} items={items} cash={cash.floorEnabled} />
    </PageShell>
  );
}
