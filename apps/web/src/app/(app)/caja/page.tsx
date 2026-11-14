// Spec 011: el corte abierto de la sucursal activa (o abrir uno).
import { CutBoard } from "@/features/cash/cut-board";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { currentCut } from "@/server/services/cash/cuts";
import { LinkButton, PageHeader, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.cash.title };

export default async function Page() {
  const { user, active } = await requirePageBranch();
  const cut = await currentCut(appCtx(), { kind: "user", scope: { actor: user, active } });
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
      <CutBoard key={cut ? `${cut.id}-${cut.status}` : "none"} cut={cut} mode="user" />
    </PageShell>
  );
}
