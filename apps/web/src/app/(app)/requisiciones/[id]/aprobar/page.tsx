// Spec 015 RF-30: asistente sobre una requisición de la sucursal activa.
import { notFound } from "next/navigation";
import { ApproveRequisitionWizard } from "@/features/requisitions/wizards/approve-requisition";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { requisitionWizardData } from "@/server/services/wizards/requisition-page";
import { PageHeader, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.requisitions.title };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ continuar?: string }> }) {
  const { user, active } = await requirePageBranch();
  const [{ id }, { continuar }] = await Promise.all([params, searchParams]);
  const data = await requisitionWizardData(appCtx(), { actor: user, active }, id);
  if (!data) notFound();
  return (
    <PageShell>
      <PageHeader title={es.requisitions.approveWizard.title(data.requisition.folio)} />
      <ApproveRequisitionWizard {...data} autoResume={continuar === "1"} />
    </PageShell>
  );
}
