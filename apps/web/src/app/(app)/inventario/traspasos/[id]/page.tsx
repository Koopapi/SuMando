// Spec 005 RF-29 a RF-38: un traspaso de los almacenes visibles; si no, no existe.
// Spec 015 RF-25, RF-37: recibir abre el asistente o la sección de siempre, según la vista que eligió la persona.
import { notFound } from "next/navigation";
import { TransferDetail } from "@/features/inventory/transfer-detail";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { movementFormData } from "@/server/services/inventory/forms";
import { transferDetail } from "@/server/services/inventory/transfers";
import { wizardView } from "@/server/services/wizards/preferences";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.transfersTitle };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
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
  return (
    <PageShell>
      <TransferDetail key={`${transfer.status}`} transfer={transfer} products={products} receiveView={transfer.canReceive ? await wizardView(ctx, user, "inv-transfer-receive") : "full"} />
    </PageShell>
  );
}
