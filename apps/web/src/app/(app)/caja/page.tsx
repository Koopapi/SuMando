// Spec 011: el corte abierto de la sucursal activa (o abrir uno).
// Spec 015 RF-23 a RF-25, RF-40: sin corte abierto, por defecto abre el asistente «Abrir caja»; `?vista=` fuerza una
// vista. Contar y capturar el reporte abren su asistente o lo de siempre según la vista de cada tarea.
import { CutBoard } from "@/features/cash/cut-board";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { currentCut } from "@/server/services/cash/cuts";
import { pageView, wizardViews } from "@/server/services/wizards/preferences";
import { OpenCashWizard } from "@/features/cash/wizards/open-cash";
import { LinkButton, PageHeader, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.cash.title };

export default async function Page({ searchParams }: { searchParams: Promise<{ vista?: string; continuar?: string }> }) {
  const { user, active } = await requirePageBranch();
  const ctx = appCtx();
  const cut = await currentCut(ctx, { kind: "user", scope: { actor: user, active } });
  const { vista, continuar } = await searchParams;
  if (!cut && (await pageView(ctx, user, "cash-open", vista)) === "wizard")
    return (
      <PageShell narrow>
        <PageHeader title={es.cash.openWizard.title} subtitle={es.cash.noneDescription} />
        <OpenCashWizard autoResume={continuar === "1"} />
      </PageShell>
    );
  const views = await wizardViews(ctx, user);
  return (
    <PageShell>
      <PageHeader
        title={es.cash.title}
        subtitle={es.cash.intro}
        action={
          <span className="flex flex-wrap gap-2">
            <LinkButton href="/caja/historial" variant="secondary">
              {es.cash.history}
            </LinkButton>
            <LinkButton href="/caja/configuracion" variant="secondary">
              {es.cash.settings}
            </LinkButton>
          </span>
        }
      />
      <CutBoard key={cut ? `${cut.id}-${cut.status}` : "none"} cut={cut} mode="user" wizards={{ cut: views["cash-cut"] ?? "wizard", pos: views["cash-pos"] ?? "wizard", open: views["cash-open"] ?? "wizard" }} />
    </PageShell>
  );
}
