// Spec 011 RF-6 a RF-10: configuración del corte de la sucursal activa.
import { CashSettingsForm } from "@/features/cash/settings-form";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { cashSettingsView } from "@/server/services/cash/settings";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.cash.settingsTitle };

export default async function Page() {
  const { user, active } = await requirePageBranch();
  return (
    <PageShell>
      <CashSettingsForm settings={await cashSettingsView(appCtx(), { actor: user, active })} />
    </PageShell>
  );
}
