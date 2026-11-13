// Spec 004 RF-29, RF-30: historial de cálculos de la sucursal activa.
import { CalculationHistory } from "@/features/recipes/calculation-history";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { listCalculations } from "@/server/services/recipes/calculations";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.recipes.history.title };

export default async function HistoryPage() {
  const { user, active } = await requirePageBranch();
  return (
    <PageShell>
      <CalculationHistory calculations={await listCalculations(appCtx(), { actor: user, active })} />
    </PageShell>
  );
}
