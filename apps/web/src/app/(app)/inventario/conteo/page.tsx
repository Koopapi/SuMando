// Spec 005 RF-42, RF-54: áreas para contar en la sucursal activa.
import { CountBoard } from "@/features/inventory/count-board";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { countBoard } from "@/server/services/inventory/counts";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.countTitle };

export default async function Page() {
  const { user, active } = await requirePageBranch();
  const board = await countBoard(appCtx(), { actor: user, active });
  return (
    <PageShell>
      <CountBoard board={board} />
    </PageShell>
  );
}
