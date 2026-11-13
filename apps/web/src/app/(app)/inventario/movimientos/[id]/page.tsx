// Spec 005 RF-60, RF-64 a RF-66: un movimiento de los almacenes visibles; si no, no existe.
import { notFound } from "next/navigation";
import { MovementDetail } from "@/features/inventory/movement-detail";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { movementDetail } from "@/server/services/inventory/movements";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.movementsTitle };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { user, active } = await requirePageBranch();
  const { id } = await params;
  const movement = await movementDetail(appCtx(), { actor: user, active }, id).catch((e) => {
    if (isAppError(e) && e.code === "not_found") return null;
    throw e;
  });
  if (!movement) notFound();
  return (
    <PageShell>
      <MovementDetail key={movement.reversal?.id ?? movement.id} movement={movement} />
    </PageShell>
  );
}
