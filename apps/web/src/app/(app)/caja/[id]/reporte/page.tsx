// Spec 015 RF-42: asistente «Reporte del punto de venta» de un corte de la sucursal activa; si no, no existe.
import { notFound } from "next/navigation";
import { PosReportWizard } from "@/features/cash/wizards/pos-report";
import { showDate } from "@/features/personnel/dates";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { cutDetail } from "@/server/services/cash/cuts";
import { PageHeader, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.cash.posWizard.title };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ continuar?: string }> }) {
  const { user, active } = await requirePageBranch();
  const cut = await cutDetail(appCtx(), { kind: "user", scope: { actor: user, active } }, (await params).id).catch((e) => {
    if (isAppError(e) && e.code === "not_found") return null;
    throw e;
  });
  if (!cut) notFound();
  const { continuar } = await searchParams;
  return (
    <PageShell narrow>
      <PageHeader title={es.cash.posWizard.title} subtitle={es.cash.cutTitle(showDate(cut.date))} />
      <PosReportWizard cut={cut} autoResume={continuar === "1"} />
    </PageShell>
  );
}
