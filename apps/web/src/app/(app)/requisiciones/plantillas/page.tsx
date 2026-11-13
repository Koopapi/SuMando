// Spec 007 RF-18 a RF-20: plantillas de compra de la sucursal activa.
import { PurchaseTemplatesManager } from "@/features/requisitions/templates-manager";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { listPurchaseTemplates } from "@/server/services/requisitions/templates";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.requisitions.templatesTitle };

export default async function Page() {
  const { user, active } = await requirePageBranch();
  const templates = await listPurchaseTemplates(appCtx(), { actor: user, active });
  return (
    <PageShell>
      <PurchaseTemplatesManager templates={templates} />
    </PageShell>
  );
}
