// Spec 010 RF-46: historial de hojas de la sucursal activa.
import { HistoryList } from "@/features/checklists/lists";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { sheetHistory } from "@/server/services/checklists/sheets";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.checklists.historyTitle };

export default async function Page() {
  const { user, active } = await requirePageBranch();
  return (
    <PageShell>
      <HistoryList sheets={await sheetHistory(appCtx(), { kind: "user", scope: { actor: user, active } })} />
    </PageShell>
  );
}
