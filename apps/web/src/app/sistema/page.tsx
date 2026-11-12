// Catálogo del sistema de diseño (spec 002, RF-40 y RF-42). Solo existe con DEV_ENDPOINTS=1: en producción, 404.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionsDemo, AlertsDemo, BadgesDemo, DialogDemo, FormsDemo } from "@/features/system/catalog-demos";
import { es } from "@/i18n";
import { devEndpointsEnabled } from "@/server/clock";
import { Button, Dial, EmptyState, ErrorState, LoadingState, PageShell, formatDate, formatMoney } from "@/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: es.system.title };

export default function SystemPage() {
  if (!devEndpointsEnabled()) notFound();
  const t = es.system;
  return (
    <PageShell title={t.title}>
      <p className="text-ink-muted">{t.intro}</p>
      <nav aria-labelledby="pantallas-tipo" className="flex flex-col gap-2">
        <h2 id="pantallas-tipo" className="font-brand text-xl font-bold">
          {t.patterns}
        </h2>
        {(Object.keys(t.patternLinks) as (keyof typeof t.patternLinks)[]).map((k) => (
          <Link key={k} href={`/sistema/${k}`} className="flex min-h-11 items-center gap-2 border-b border-line font-semibold text-primary">
            {t.patternLinks[k]}
          </Link>
        ))}
      </nav>
      <ActionsDemo />
      <FormsDemo />
      <AlertsDemo />
      <DialogDemo />
      <BadgesDemo />
      <section aria-labelledby="perilla" className="flex flex-col gap-4 border-t border-line pt-6">
        <h2 id="perilla" className="font-brand text-xl font-bold">
          {t.dials}
        </h2>
        <div className="flex items-center gap-4">
          {[1, 2, 3, 4].map((n) => (
            <Dial key={n} value={n / 4} label={t.dialLabel(n, 4)} />
          ))}
          <Dial value={0.6} spinning />
        </div>
      </section>
      <section aria-labelledby="estados" className="flex flex-col gap-4 border-t border-line pt-6">
        <h2 id="estados" className="font-brand text-xl font-bold">
          {t.states}
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <LoadingState />
          <EmptyState title={t.emptyTitle} description={t.emptyBody} action={<Button variant="secondary">{t.clear}</Button>} />
          <ErrorState action={<Button>{es.common.retry}</Button>} />
        </div>
      </section>
      <section aria-labelledby="formatos" className="flex flex-col gap-2 border-t border-line pt-6">
        <h2 id="formatos" className="font-brand text-xl font-bold">
          {t.formats}
        </h2>
        <p>
          {t.moneySample}: <span data-testid="money-sample">{formatMoney(1234.5)}</span>
        </p>
        <p>
          {t.dateSample}: <span data-testid="date-sample">{formatDate(new Date("2026-11-11T18:00:00Z"))}</span>
        </p>
      </section>
    </PageShell>
  );
}
