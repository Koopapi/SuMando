"use client";

// Detalle de una sección de dinero (spec 012, RF-21 a RF-24, RF-27, RF-30, RF-34): total general, una fila por
// negocio que se desglosa por sucursal en la misma pantalla, y la lista propia de cada sección.
import { useState } from "react";
import { addDays } from "@/domain/payroll/week";
import { es } from "@/i18n";
import type { FigureRow, MoneyDetail } from "@/server/services/reports/figures";
import { BusinessMark, Icon, SectionLabel, logoUrl } from "@/ui";
import { showDate } from "../personnel/dates";
import { Amount, Change } from "./figure";

const t = es.dashboard;

function Row({ row, strong = false }: { row: FigureRow; strong?: boolean }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
      <span className={`min-w-0 truncate ${strong ? "font-semibold" : ""}`}>{row.name}</span>
      <span className="flex flex-col items-end">
        <Amount value={row.figure.amount} />
        <Change figure={row.figure} />
      </span>
    </div>
  );
}

export function MoneyDetailView({ detail }: { detail: MoneyDetail }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-6">
      {t.sectionHints[detail.section] ? <p className="text-sm text-ink-muted">{t.sectionHints[detail.section]}</p> : null}
      <div className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-4" data-testid="detail-total">
        <SectionLabel as="h3">{t.total}</SectionLabel>
        <Amount value={detail.total.amount} size="large" />
        <Change figure={detail.total} />
      </div>

      <div className="flex flex-col">
        <SectionLabel as="h3">{t.byBusiness}</SectionLabel>
        <ul className="flex flex-col">
          {detail.businesses.map((b) => {
            const open = expanded === b.id;
            return (
              <li key={b.id} className={`biz-${b.color} border-b border-line`} data-business-color={b.color}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setExpanded(open ? null : b.id)}
                  className="flex w-full min-w-0 items-center gap-3 text-left hover:bg-primary-soft lg:px-2"
                >
                  <BusinessMark name={b.name} color={b.color} logoUrl={logoUrl(b.id, b.logoVersion)} size="sm" />
                  <span className="min-w-0 flex-1">
                    <Row row={b} strong />
                  </span>
                  <span className="sr-only">{open ? t.hideBranches(b.name) : t.showBranches(b.name)}</span>
                  <Icon name={open ? "chevronUp" : "chevronDown"} className="text-ink-muted" />
                </button>
                {open ? (
                  <ul className="flex flex-col border-t border-line pl-6" data-testid={`branches-${b.name}`}>
                    {b.branches.map((br) => (
                      <li key={br.id} className="border-b border-line last:border-b-0">
                        <Row row={br} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {detail.methods ? (
        <div className="flex flex-col">
          <SectionLabel as="h3">{t.byMethod}</SectionLabel>
          <ul className="flex flex-col" data-testid="detail-methods">
            {detail.methods.map((m) => (
              <li key={m.id} className="border-b border-line">
                <Row row={m} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {detail.expenses ? (
        <div className="flex flex-col">
          <SectionLabel as="h3">{t.expensesList}</SectionLabel>
          {detail.expenses.length === 0 ? (
            <p className="py-2 text-ink-muted">{t.noExpenses}</p>
          ) : (
            <ul className="flex flex-col" data-testid="detail-expenses">
              {detail.expenses.map((e) => (
                <li key={e.id} className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 border-b border-line py-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">{e.concept}</span>
                    <span className="text-sm text-ink-muted">{`${showDate(e.date)} · ${t.placeLine(e.business, e.branch)}`}</span>
                  </span>
                  <Amount value={e.amount} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {detail.weeks ? (
        <div className="flex flex-col">
          <SectionLabel as="h3">{t.weeksList}</SectionLabel>
          {detail.weeks.length === 0 ? (
            <p className="py-2 text-ink-muted">{t.noWeeks}</p>
          ) : (
            <ul className="flex flex-col" data-testid="detail-weeks">
              {detail.weeks.map((w) => (
                <li key={w.id} className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 border-b border-line py-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">{t.payrollTitle(showDate(w.weekStart), showDate(addDays(w.weekStart, 6)))}</span>
                    <span className="text-sm text-ink-muted">{t.placeLine(w.business, w.branch)}</span>
                  </span>
                  <Amount value={w.total} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
