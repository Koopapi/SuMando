// Spec 010 RF-1, RF-2: plantillas del negocio activo.
import { TemplatesList } from "@/features/checklists/lists";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { listTemplates } from "@/server/services/checklists/templates";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.checklists.templatesTitle };

export default async function Page() {
  const { user, active } = await requirePageBranch();
  return (
    <PageShell>
      <TemplatesList templates={await listTemplates(appCtx(), { actor: user, active })} />
    </PageShell>
  );
}
