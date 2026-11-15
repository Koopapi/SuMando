"use client";

// Tablero (spec 012): periodo, secciones con su número y el detalle de la elegida en la misma pantalla (RF-7 a
// RF-10). El servidor calcula todo; aquí solo se elige qué ver.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addDays } from "@/domain/payroll/week";
import { es } from "@/i18n";
import type { DashboardSummary, SectionDetail } from "@/server/services/reports/dashboard";
import type { Section } from "@/server/services/reports/scope";
import { Alert, Button, EmptyState, TextField } from "@/ui";
import { formValues } from "../api";
import { AlertsDetailView } from "./alerts-detail";
import { MoneyDetailView } from "./money-detail";
import { Amount, Change } from "./figure";
import { apiPeriod, dashboardHref, type DashboardQuery } from "./query";
import { showDate } from "../personnel/dates";

const t = es.dashboard;
const PERIODS = ["today", "week", "month", "range"] as const;

export function DashboardBoard({ summary, detail, error }: { summary: DashboardSummary; detail: SectionDetail | null; error: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rangeOpen, setRangeOpen] = useState(summary.period.kind === "range");
  const go = (q: DashboardQuery) => start(() => router.replace(dashboardHref(q), { scroll: false }));
  const p = summary.period;
  const base: DashboardQuery = p.kind === "range" ? { periodo: "range", desde: p.from, hasta: p.to } : { periodo: p.kind };
  const open = detail?.section ?? null;

  if (!summary.hasBranches) return <EmptyState title={t.noBranches} description={t.noBranchesDescription} />;

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      <section aria-labelledby="periodo" className="flex flex-col gap-3">
        <h2 id="periodo" className="text-xs font-semibold tracking-widest text-ink-muted uppercase">
          {t.periodLabel}
        </h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.periodLabel}>
          {PERIODS.map((k) => {
            const current = k === "range" ? rangeOpen : !rangeOpen && p.kind === k;
            return (
              <Button key={k} variant={current ? "primary" : "secondary"} aria-pressed={current} onClick={() => (k === "range" ? setRangeOpen(true) : (setRangeOpen(false), go({ periodo: k, seccion: open ?? undefined })))}>
                {t.periods[k]}
              </Button>
            );
          })}
        </div>
        {rangeOpen ? (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = formValues(e.currentTarget);
              go({ periodo: "range", desde: v.desde, hasta: v.hasta, seccion: open ?? undefined });
            }}
          >
            <TextField label={t.from} name="desde" type="date" required defaultValue={p.kind === "range" ? p.from : addDays(p.to, -6)} className="min-w-0 flex-1 sm:max-w-xs" />
            <TextField label={t.to} name="hasta" type="date" required defaultValue={p.to} className="min-w-0 flex-1 sm:max-w-xs" />
            <Button type="submit" loading={pending}>
              {t.apply}
            </Button>
          </form>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}
        <p className="text-sm text-ink-muted" data-testid="dashboard-period">
          {t.periodLine(showDate(p.from), showDate(p.to))} · {t.previousLine(showDate(p.prevFrom), showDate(p.prevTo))}
        </p>
      </section>

      <section aria-label={t.sectionsLabel} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summary.sections.map((s) => (
          <SectionButton key={s} section={s} summary={summary} open={open === s} onToggle={() => go({ ...base, seccion: open === s ? undefined : s })} />
        ))}
      </section>

      {detail ? (
        <section aria-labelledby="detalle" className="flex flex-col gap-4 border-t border-line pt-4" data-testid="dashboard-detail">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="detalle" className="font-brand text-2xl font-bold">
              {t.sections[detail.section]}
            </h2>
            <a href={`/api/dashboard/${detail.section}/excel?${apiPeriod(base)}`} download className="inline-flex min-h-11 items-center justify-center rounded-md border border-line-strong bg-surface px-4 font-brand font-bold text-ink hover:bg-primary-soft">
              {t.excel}
            </a>
          </div>
          {detail.section === "alerts" ? <AlertsDetailView alerts={detail.alerts} /> : <MoneyDetailView detail={detail} />}
        </section>
      ) : null}
    </div>
  );
}

function SectionButton({ section, summary, open, onToggle }: { section: Section; summary: DashboardSummary; open: boolean; onToggle: () => void }) {
  const figure = section === "alerts" ? null : summary.figures[section];
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls="detalle"
      onClick={onToggle}
      data-testid={`section-${section}`}
      className={`flex min-h-24 flex-col items-start gap-1 rounded-lg border p-4 text-left transition hover:bg-primary-soft ${open ? "border-primary bg-primary-soft" : "border-line bg-surface"}`}
    >
      <span className="text-xs font-semibold tracking-widest text-ink-muted uppercase">{t.sections[section]}</span>
      {figure ? (
        <>
          <Amount value={figure.amount} size="large" />
          <Change figure={figure} />
        </>
      ) : (
        <span className={`font-brand text-2xl font-bold ${summary.alerts > 0 ? "text-warning" : "text-success"}`}>{t.alertsCount(summary.alerts)}</span>
      )}
    </button>
  );
}
