// Spec 005 RF-43 a RF-51: contar un área. Sin almacén ni lista, se manda a armarla.
// Spec 015 RF-23: con la vista de asistente (la de siempre, salvo que la persona eligiera otra), abre el asistente en
// esta área; `?vista=completa` fuerza la hoja.
import { notFound, redirect } from "next/navigation";
import { CountSheet } from "@/features/inventory/count-sheet";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { countSheet } from "@/server/services/inventory/counts";
import { pageView } from "@/server/services/wizards/preferences";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.countTitle };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ vista?: string }> }) {
  const { user, active } = await requirePageBranch();
  const { id } = await params;
  const { vista } = await searchParams;
  if ((await pageView(appCtx(), user, "inv-count", vista)) === "wizard") redirect(`/inventario/conteo?area=${encodeURIComponent(id)}`);
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
