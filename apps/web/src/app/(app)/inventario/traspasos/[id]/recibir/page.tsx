// Spec 015 RF-37: asistente «Recibir traspaso» de un traspaso de los almacenes visibles; si no, no existe.
import { notFound } from "next/navigation";
import { ReceiveTransferWizard } from "@/features/inventory/wizards/receive-transfer";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { movementFormData } from "@/server/services/inventory/forms";
import { transferDetail } from "@/server/services/inventory/transfers";
import { PageHeader, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.receiveWizard.title };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ continuar?: string }> }) {
  const { user, active } = await requirePageBranch();
  const scope = { actor: user, active };
  const ctx = appCtx();
  const { id } = await params;
  const transfer = await transferDetail(ctx, scope, id).catch((e) => {
    if (isAppError(e) && e.code === "not_found") return null;
    throw e;
  });
  if (!transfer) notFound();
  const products = transfer.canReceive ? (await movementFormData(ctx, scope)).products : [];
  const { continuar } = await searchParams;
  return (
    <PageShell narrow>
      <PageHeader title={es.inventory.receiveWizard.title} subtitle={es.inventory.transferTitleOf(transfer.from.warehouse, transfer.to.warehouse)} />
      <ReceiveTransferWizard transfer={transfer} products={products} autoResume={continuar === "1"} />
    </PageShell>
  );
}
