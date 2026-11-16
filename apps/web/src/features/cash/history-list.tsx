// Spec 011 RF-40: historial de cortes de la sucursal.
import { es } from "@/i18n";
import type { CutSummaryView } from "@/server/services/cash/cuts";
import { EmptyState, ListRow, PageHeader, formatDateTime, formatMoney } from "@/ui";
import { showDate } from "../personnel/dates";

const t = es.cash;
const money = (x: string | null) => (x === null ? null : formatMoney(Number(x)));

export function CutHistory({ cuts }: { cuts: CutSummaryView[] }) {
  return (
    <>
      <PageHeader title={t.historyTitle} subtitle={t.historyIntro} />
      {cuts.length === 0 ? (
        <EmptyState title={t.historyEmpty} />
      ) : (
        <ul className="flex flex-col" data-testid="cash-history">
          {cuts.map((c) => (
            <li key={c.id}>
              <ListRow href={`/caja/${c.id}`} icon="cash" title={`${t.cutTitle(showDate(c.date))} · ${formatDateTime(new Date(c.openedAt))}`} detail={t.historyLine(t.statusLabels[c.status], money(c.posTotal), money(c.salesBefore), money(c.totalDifference))} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
