// Spec 010 RF-6 a RF-11: nueva plantilla.
import { editorOptions } from "@/features/checklists/editor-data";
import { TemplateEditor } from "@/features/checklists/template-editor";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { templatesAccess } from "@/server/services/checklists/templates";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.checklists.editorNew };

export default async function Page() {
  const { user, active } = await requirePageBranch();
  const ctx = appCtx();
  const scope = { actor: user, active };
  await templatesAccess(ctx.store, scope);
  const { branches, positions } = await editorOptions(ctx, scope);
  return (
    <PageShell>
      <TemplateEditor template={null} branches={branches} positions={positions} />
    </PageShell>
  );
}
