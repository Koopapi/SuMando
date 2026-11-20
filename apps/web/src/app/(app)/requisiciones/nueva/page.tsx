// Spec 007 RF-7 a RF-23: armar una requisición; `?plantilla=` empieza con una plantilla de compra.
// Spec 015 RF-23 a RF-28: por defecto abre el asistente; `?vista=completa|asistente` fuerza una vista y `?continuar=1`
// sigue con lo que se capturó en la otra.
import { RequisitionBuilder } from "@/features/requisitions/requisition-builder";
import { NewRequisitionWizard } from "@/features/requisitions/wizards/new-requisition";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { builderData, suggestLines } from "@/server/services/requisitions/requisitions";
import { wizardExamples } from "@/server/services/wizards/examples";
import { pageView } from "@/server/services/wizards/preferences";
import { PageHeader, PageShell, formatDateTime } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.requisitions.newTitle };

export default async function Page({ searchParams }: { searchParams: Promise<{ plantilla?: string; vista?: string; continuar?: string }> }) {
  const { user, active } = await requirePageBranch();
  const scope = { actor: user, active };
  const ctx = appCtx();
  const data = await builderData(ctx, scope);
  const { plantilla, vista, continuar } = await searchParams;
  const t = es.requisitions;
  const calculations = data.calculations.map((c) => ({ id: c.id, label: t.calculationOption(formatDateTime(new Date(c.createdAt)), c.author) }));
  // Con una plantilla de la lista de plantillas se abre la pantalla completa, que ya la trae cargada.
  if (!plantilla && (await pageView(ctx, user, "req-new", vista)) === "wizard")
    return (
      <PageShell>
        <PageHeader title={t.newTitle} />
        <NewRequisitionWizard {...data} calculations={calculations} examples={await wizardExamples(ctx, scope)} autoResume={continuar === "1"} />
      </PageShell>
    );
  const start =
    plantilla && data.warehouses[0]
      ? await suggestLines(ctx, scope, { warehouseId: data.warehouses[0].id, source: "template", id: plantilla }).catch((e) => {
          if (isAppError(e) && e.code === "not_found") return null;
          throw e;
        })
      : null;
  return (
    <PageShell>
      <RequisitionBuilder
        {...data}
        calculations={calculations}
        initial={start?.lines}
        initialNotice={start ? [t.added(start.lines.length), start.skipped.length ? t.skipped(start.skipped.join(", ")) : ""].filter(Boolean).join(" ") : undefined}
      />
    </PageShell>
  );
}
