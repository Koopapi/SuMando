// Spec 010 RF-6 a RF-11: nueva plantilla.
// Spec 015 RF-23 a RF-25, RF-47: por defecto abre el asistente «Nueva plantilla de checklist»; `?vista=` fuerza una
// vista y `?continuar=1` sigue con lo que se capturó en la otra.
import { editorOptions } from "@/features/checklists/editor-data";
import { TemplateEditor } from "@/features/checklists/template-editor";
import { NewTemplateWizard } from "@/features/checklists/wizards/new-template";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { templatesAccess } from "@/server/services/checklists/templates";
import { pageView } from "@/server/services/wizards/preferences";
import { PageHeader, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.checklists.editorNew };

export default async function Page({ searchParams }: { searchParams: Promise<{ vista?: string; continuar?: string }> }) {
  const { user, active } = await requirePageBranch();
  const ctx = appCtx();
  const scope = { actor: user, active };
  await templatesAccess(ctx.store, scope);
  const { branches, positions } = await editorOptions(ctx, scope);
  const { vista, continuar } = await searchParams;
  if ((await pageView(ctx, user, "new-checklist", vista)) === "wizard")
    return (
      <PageShell narrow>
        <PageHeader title={es.checklists.editorNew} subtitle={es.checklists.editorIntro} />
        <NewTemplateWizard branches={branches} positions={positions} autoResume={continuar === "1"} />
      </PageShell>
    );
  return (
    <PageShell>
      <TemplateEditor template={null} branches={branches} positions={positions} />
    </PageShell>
  );
}
