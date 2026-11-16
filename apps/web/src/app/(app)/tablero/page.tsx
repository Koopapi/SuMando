// Spec 012: tablero de todos los negocios y sucursales que ve la persona; periodo y sección en la dirección.
import { DashboardBoard } from "@/features/dashboard/dashboard-board";
import type { DashboardQuery } from "@/features/dashboard/query";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { dashboardPage } from "@/server/services/reports/dashboard";
import { PageHeader, PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.dashboard.title };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requirePageBranch();
  const raw = await searchParams;
  const query: DashboardQuery = { periodo: one(raw.periodo), desde: one(raw.desde), hasta: one(raw.hasta), seccion: one(raw.seccion) };
  const input = { period: query.periodo, from: query.desde, to: query.hasta };
  const ctx = appCtx();
  // Un rango inválido se explica y el tablero vuelve a Hoy (RF-13 a RF-15).
  const { data, error } = await dashboardPage(ctx, user, input, query.seccion).then(
    (d) => ({ data: d, error: null as string | null }),
    async (e) => {
      if (!isAppError(e) || !["range_order", "range_too_long", "range_future", "validation"].includes(e.code)) throw e;
      return { data: await dashboardPage(ctx, user, {}, query.seccion), error: e.message };
    },
  );
  return (
    <PageShell>
      <PageHeader title={es.dashboard.title} subtitle={data.summary.owner ? es.dashboard.introOwner : es.dashboard.intro} />
      <DashboardBoard summary={data.summary} detail={data.detail} error={error} />
    </PageShell>
  );
}
