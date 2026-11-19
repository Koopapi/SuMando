// Spec 007 RF-24 a RF-45: una requisición de la sucursal activa; de otra, no existe.
import { notFound } from "next/navigation";
import { RequisitionDetail } from "@/features/requisitions/requisition-detail";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { requisitionDetail } from "@/server/services/requisitions/requisitions";
import { wizardViews } from "@/server/services/wizards/preferences";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.requisitions.title };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { user, active } = await requirePageBranch();
  const { id } = await params;
  const r = await requisitionDetail(appCtx(), { actor: user, active }, id).catch((e) => {
    if (isAppError(e) && e.code === "not_found") return null;
    throw e;
  });
  if (!r) notFound();
  // Spec 015, RF-23: sin elección, cada tarea abre su asistente.
  const views = await wizardViews(appCtx(), user);
  const wizards = { approve: views["req-approve"] !== "full", buy: views["req-buy"] !== "full", receive: views["req-receive"] !== "full" };
  return (
    <PageShell>
      <RequisitionDetail key={`${r.status}-${r.events.length}`} requisition={r} wizards={wizards} />
    </PageShell>
  );
}
