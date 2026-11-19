// Spec 005 RF-42, RF-54: áreas para contar en la sucursal activa.
// Spec 015 RF-23 a RF-25, RF-33: por defecto abre el asistente «Contar un área» (`?area=` lo empieza en un área);
// `?vista=completa|asistente` fuerza una vista y `?continuar=1` sigue con lo que se capturó en la otra.
import { CountBoard } from "@/features/inventory/count-board";
import { CountAreaWizard } from "@/features/inventory/wizards/count-area";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { countBoard } from "@/server/services/inventory/counts";
import { pageView } from "@/server/services/wizards/preferences";
import { PageHeader, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.countTitle };

export default async function Page({ searchParams }: { searchParams: Promise<{ area?: string; vista?: string; continuar?: string }> }) {
  const { user, active } = await requirePageBranch();
  const ctx = appCtx();
  const board = await countBoard(ctx, { actor: user, active });
  const { area, vista, continuar } = await searchParams;
  if ((await pageView(ctx, user, "inv-count", vista)) === "wizard")
    return (
      <PageShell narrow>
        <PageHeader title={es.inventory.countWizard.title} />
        <CountAreaWizard areas={board.areas} area={area} autoResume={continuar === "1"} />
      </PageShell>
    );
  return (
    <PageShell>
      <CountBoard board={board} />
    </PageShell>
  );
}
