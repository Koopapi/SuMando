// Spec 010 RF-38: una hoja de hoy en el teléfono de piso.
import { redirect } from "next/navigation";
import { todayInMexico } from "@/domain/personnel/documents";
import { FloorSheet } from "@/features/checklists/floor";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { currentFloorDevice } from "@/server/auth/checklist-actor";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.checklists.floorTitle };

export default async function Page({ params }: { params: Promise<{ templateId: string }> }) {
  if (!(await currentFloorDevice())) redirect("/login");
  return (
    <PageShell>
      <FloorSheet templateId={(await params).templateId} today={todayInMexico(appCtx().ports.clock.now())} />
    </PageShell>
  );
}
