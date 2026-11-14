// Spec 010: las listas de checklists (hoy, historial y plantillas), sin estado propio.
import { es } from "@/i18n";
import type { SheetSummaryView, TodayView } from "@/server/services/checklists/sheets";
import type { TemplateSummaryView } from "@/server/services/checklists/templates";
import { EmptyState, LinkButton, ListRow, PageHeader, StatusBadge } from "@/ui";
import { showDate } from "../personnel/dates";

const t = es.checklists;

export function TodayList({ items, today, hrefOf }: { items: TodayView[]; today: string; hrefOf: (templateId: string) => string }) {
  if (items.length === 0) return <EmptyState title={t.todayEmpty} description={t.todayEmptyDescription} />;
  return (
    <ul className="flex flex-col" data-testid="checklists-today">
      {items.map((c) => (
        <li key={c.templateId}>
          <ListRow href={hrefOf(c.templateId)} icon="clipboard" title={c.name} detail={`${t.statuses[c.status]} · ${t.progress(c.sectionsReady, c.sections)} · ${showDate(today)}`} />
        </li>
      ))}
    </ul>
  );
}

export function ChecklistsHome({ items, today }: { items: TodayView[]; today: string }) {
  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={t.intro}
        figure={String(items.length)}
        figureLabel={showDate(today)}
        action={
          <span className="flex flex-wrap gap-2">
            <LinkButton href="/checklists/historial" variant="secondary">
              {t.history}
            </LinkButton>
            <LinkButton href="/checklists/plantillas" variant="secondary">
              {t.templates}
            </LinkButton>
            <LinkButton href="/checklists/telefonos" variant="secondary">
              {t.devices}
            </LinkButton>
          </span>
        }
      />
      <TodayList items={items} today={today} hrefOf={(id) => `/checklists/${id}/${today}`} />
    </>
  );
}

export function HistoryList({ sheets }: { sheets: SheetSummaryView[] }) {
  return (
    <>
      <PageHeader title={t.historyTitle} subtitle={t.historyIntro} />
      {sheets.length === 0 ? (
        <EmptyState title={t.historyEmpty} description={t.historyEmptyDescription} />
      ) : (
        <ul className="flex flex-col" data-testid="checklists-history">
          {sheets.map((s) => (
            <li key={`${s.templateId}-${s.date}`}>
              <ListRow href={`/checklists/${s.templateId}/${s.date}`} icon="history" title={t.sheetTitle(s.templateName, showDate(s.date))} detail={t.historyDetail(t.statuses[s.status], s.pending, s.closedBy)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const daysText = (days: number[]) => (days.length === 7 ? t.everyDay : days.map((d) => t.dayShort[d]).join(", "));

export function TemplatesList({ templates }: { templates: TemplateSummaryView[] }) {
  return (
    <>
      <PageHeader
        title={t.templatesTitle}
        subtitle={t.templatesIntro}
        action={
          <LinkButton href="/checklists/plantillas/nueva" icon="plus">
            {t.newTemplate}
          </LinkButton>
        }
      />
      {templates.length === 0 ? (
        <EmptyState title={t.templatesEmpty} description={t.templatesEmptyDescription} />
      ) : (
        <ul className="flex flex-col" data-testid="checklist-templates">
          {templates.map((x) => (
            <li key={x.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <ListRow href={`/checklists/plantillas/${x.id}`} icon="clipboard" title={x.name} detail={t.templateLine(daysText(x.days), x.branches.join(", "), x.sections, x.items)} />
              </div>
              {x.archived ? <StatusBadge tone="neutral">{t.archivedBadge}</StatusBadge> : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
