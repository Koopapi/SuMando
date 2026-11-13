// Spec 005 RF-43 a RF-51: contar un área. Sin almacén ni lista, se manda a armarla.
import { notFound, redirect } from "next/navigation";
import { CountSheet } from "@/features/inventory/count-sheet";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { countSheet } from "@/server/services/inventory/counts";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.countTitle };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { user, active } = await requirePageBranch();
  const { id } = await params;
  const sheet = await countSheet(appCtx(), { actor: user, active }, id).catch((e) => {
    if (isAppError(e) && e.code === "area_without_warehouse") redirect(`/almacenes/areas/${id}`);
    if (isAppError(e) && (e.code === "not_found" || e.code === "archived_item")) return null;
    throw e;
  });
  if (!sheet) notFound();
  return (
    <PageShell narrow>
      <CountSheet sheet={sheet} draftKey={`sumando:conteo:${user.id}:${id}`} />
    </PageShell>
  );
}
