// Spec 009 RF-46: historial de semanas; el total solo llega en la vista del dueño.
import { es } from "@/i18n";
import type { PayrollWeekSummaryView } from "@/server/services/payroll/views";
import { EmptyState, LinkButton, ListRow, PageHeader, formatMoney } from "@/ui";
import { showDate } from "../personnel/dates";

const t = es.payroll;

export function WeeksList({ weeks }: { weeks: PayrollWeekSummaryView[] }) {
  return (
    <>
      <PageHeader
        title={t.historyTitle}
        subtitle={t.historyIntro}
        action={
          <LinkButton href="/nomina" variant="secondary">
            {t.thisWeek}
          </LinkButton>
        }
      />
      {weeks.length === 0 ? (
        <EmptyState title={t.historyEmpty} description={t.historyEmptyDescription} />
      ) : (
        <ul className="flex flex-col" data-testid="payroll-weeks">
          {weeks.map((w) => (
            <li key={w.start}>
              <ListRow
                href={`/nomina/${w.start}`}
                icon="history"
                title={t.weekShort(showDate(w.start), showDate(w.end))}
                detail={[w.status === "open" ? t.open : t.closed, t.people(w.people), w.total ? formatMoney(Number(w.total)) : null].filter(Boolean).join(" · ")}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
