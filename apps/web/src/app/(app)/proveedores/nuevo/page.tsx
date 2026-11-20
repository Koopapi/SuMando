// Spec 015 RF-45: asistente «Nuevo proveedor»; el comprador se elige en la sucursal activa (spec 013).
import { NewSupplierWizard } from "@/features/catalog/wizards/new-supplier";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { listSupplierBuyers } from "@/server/services/catalog/supplier-buyers";
import { catalogView } from "@/server/services/catalog/views";
import { wizardExamples } from "@/server/services/wizards/examples";
import { PageHeader, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.catalog.suppliers.createTitle };

export default async function Page({ searchParams }: { searchParams: Promise<{ continuar?: string }> }) {
  const { user, active } = await requirePageBranch();
  const scope = { actor: user, active };
  const ctx = appCtx();
  const [view, examples] = await Promise.all([catalogView(ctx, scope), wizardExamples(ctx, scope)]);
  const buyers = await listSupplierBuyers(ctx, scope).catch((e) => {
    if (isAppError(e) && e.code === "forbidden") return null;
    throw e;
  });
  const { continuar } = await searchParams;
  return (
    <PageShell narrow>
      <PageHeader title={es.catalog.suppliers.createTitle} />
      <NewSupplierWizard names={view.suppliers.map((s) => s.name)} buyers={buyers} branchName={active.branch.name} examples={examples} autoResume={continuar === "1"} />
    </PageShell>
  );
}
