// Spec 010 RF-9 a RF-14: editar una plantilla.
import { notFound } from "next/navigation";
import { editorOptions } from "@/features/checklists/editor-data";
import { TemplateEditor } from "@/features/checklists/template-editor";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { getTemplate } from "@/server/services/checklists/templates";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.checklists.editorEdit };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { user, active } = await requirePageBranch();
  const ctx = appCtx();
  const scope = { actor: user, active };
  const template = await getTemplate(ctx, scope, (await params).id).catch((e) => {
    if (isAppError(e) && e.code === "not_found") return null;
    throw e;
  });
  if (!template) notFound();
  const { branches, positions } = await editorOptions(ctx, scope);
  return (
    <PageShell>
      <TemplateEditor key={template.id} template={template} branches={branches} positions={positions} />
    </PageShell>
  );
}
