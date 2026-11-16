// Spec 011 RF-40: historial de cortes de la sucursal activa.
import { CutHistory } from "@/features/cash/history-list";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { cutHistory } from "@/server/services/cash/cuts";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.cash.historyTitle };

export default async function Page() {
  const { user, active } = await requirePageBranch();
  return (
    <PageShell>
      <CutHistory cuts={await cutHistory(appCtx(), { kind: "user", scope: { actor: user, active } })} />
    </PageShell>
  );
}
