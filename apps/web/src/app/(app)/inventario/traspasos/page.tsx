// Spec 005 RF-28: traspasos por recibir, enviados en camino y recientes.
import { TransfersList } from "@/features/inventory/transfers-list";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { listTransfers } from "@/server/services/inventory/transfers";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.transfersTitle };

export default async function Page() {
  const { user, active } = await requirePageBranch();
  const data = await listTransfers(appCtx(), { actor: user, active });
  return (
    <PageShell>
      <TransfersList {...data} />
    </PageShell>
  );
}
