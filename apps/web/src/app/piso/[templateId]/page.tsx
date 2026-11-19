// Spec 010 RF-38 y spec 015 RF-48: una hoja de hoy en el teléfono de piso, con su asistente o completa.
import { redirect } from "next/navigation";
import { todayInMexico } from "@/domain/personnel/documents";
import { FloorSheet } from "@/features/checklists/floor";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { currentFloorDevice } from "@/server/auth/checklist-actor";
import { floorEmployees } from "@/server/services/checklists/floor";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.checklists.floorTitle };

export default async function Page({ params, searchParams }: { params: Promise<{ templateId: string }>; searchParams: Promise<{ vista?: string }> }) {
  const base = await currentFloorDevice();
  if (!base) redirect("/login");
  const ctx = appCtx();
  const { vista } = await searchParams;
  const employees = await floorEmployees(ctx, base.branch.id, base.business.id);
  return (
    <PageShell>
      <FloorSheet templateId={(await params).templateId} today={todayInMexico(ctx.ports.clock.now())} employees={employees} view={vista === "completa" ? "full" : vista === "asistente" ? "wizard" : null} />
    </PageShell>
  );
}
