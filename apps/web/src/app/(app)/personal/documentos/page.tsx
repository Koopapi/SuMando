// Spec 008 RF-16, RF-17: la lista de documentos que pide el negocio.
import { DocumentTypesManager } from "@/features/personnel/document-types-manager";
import { es } from "@/i18n";
import { isOwner } from "@/domain/access/owner";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { listDocumentTypes } from "@/server/services/personnel/document-types";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.personnel.documentsTitle };

export default async function Page() {
  const { user, active } = await requirePageBranch();
  const types = await listDocumentTypes(appCtx(), { actor: user, active });
  return (
    <PageShell narrow>
      <DocumentTypesManager types={types} owner={isOwner(user)} />
    </PageShell>
  );
}
