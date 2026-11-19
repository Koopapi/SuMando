// Spec 015 RF-43, RF-44: asistente «Nuevo producto» en el negocio de la sucursal activa.
import { NewProductWizard } from "@/features/catalog/wizards/new-product";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { catalogView } from "@/server/services/catalog/views";
import { wizardExamples } from "@/server/services/wizards/examples";
import { PageHeader, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.catalog.products.createTitle };

export default async function Page({ searchParams }: { searchParams: Promise<{ continuar?: string }> }) {
  const { user, active } = await requirePageBranch();
  const scope = { actor: user, active };
  const ctx = appCtx();
  const [view, examples] = await Promise.all([catalogView(ctx, scope), wizardExamples(ctx, scope)]);
  const { continuar } = await searchParams;
  return (
    <PageShell narrow>
      <PageHeader title={es.catalog.products.createTitle} />
      <NewProductWizard names={view.products.map((p) => p.name)} suppliers={view.suppliers} warehouses={view.warehouses} examples={examples} autoResume={continuar === "1"} />
    </PageShell>
  );
}
