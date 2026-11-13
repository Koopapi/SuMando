// Spec 007 RF-42, RF-43: requisiciones de la sucursal con filtro por estado.
import Link from "next/link";
import { es } from "@/i18n";
import type { RequisitionSummaryView } from "@/server/services/requisitions/views";
import { Button, EmptyState, LinkButton, PageHeader, SelectField, StatusBadge, formatDateTime, formatMoney } from "@/ui";

const t = es.requisitions;
const TONE = { requested: "warning", approved: "neutral", rejected: "danger", cancelled: "danger", closed: "success" } as const;

export function RequisitionsList({ requisitions, status }: { requisitions: RequisitionSummaryView[]; status: string | undefined }) {
  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={t.intro}
        action={
          <span className="flex flex-wrap gap-2">
            <LinkButton href="/requisiciones/nueva" icon="plus">
              {t.create}
            </LinkButton>
            <LinkButton href="/requisiciones/plantillas" variant="secondary">
              {t.templates}
            </LinkButton>
          </span>
        }
      />
      <form method="get" className="flex flex-wrap items-end gap-3">
        <SelectField label={t.status} name="estado" className="min-w-48" defaultValue={status ?? ""} options={[{ value: "", label: t.allStatuses }, ...Object.entries(t.statuses).map(([value, label]) => ({ value, label }))]} />
        <Button type="submit" variant="secondary">
          {t.filter}
        </Button>
      </form>
      {requisitions.length === 0 ? (
        <EmptyState title={t.emptyTitle} description={t.emptyDescription} />
      ) : (
        <ul className="flex flex-col" aria-label={t.listCaption}>
          {requisitions.map((r) => (
            <li key={r.id} className="border-b border-line">
              <Link href={`/requisiciones/${r.id}`} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 py-2 hover:bg-primary-soft">
                <span className="font-semibold text-primary">{t.folio(r.folio)}</span>
                <StatusBadge tone={TONE[r.status]}>{t.statuses[r.status]}</StatusBadge>
                {r.pending ? <StatusBadge tone="warning">{t.pendingBadge}</StatusBadge> : null}
                {r.total ? <span className="text-sm font-semibold">{formatMoney(Number(r.total))}</span> : null}
                <span className="basis-full text-sm text-ink-muted lg:ml-auto lg:basis-auto">{t.summaryLine(r.warehouseName, formatDateTime(new Date(r.createdAt)), r.author, r.lines)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
