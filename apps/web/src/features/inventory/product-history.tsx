// Spec 005 RF-61: historial de un producto en un almacén, con la existencia que dejó cada movimiento.
import Link from "next/link";
import { es } from "@/i18n";
import type { HistoryEntryView } from "@/server/services/inventory/views";
import { EmptyState, PageHeader, StatusBadge, formatDateTime, formatQuantity } from "@/ui";
import { unitShort } from "../catalog/labels";
import { kindLabel } from "./labels";

const t = es.inventory;

export function ProductHistory({ product, warehouse, entries, next }: { product: { id: string; name: string; presentation: string | null; baseUnit: string }; warehouse: { id: string; name: string }; entries: HistoryEntryView[]; next: number | null }) {
  return (
    <>
      <Link href={`/inventario?almacen=${warehouse.id}`} className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
        {t.back}
      </Link>
      <PageHeader title={t.historyTitle(product.name)} subtitle={t.historyIntro(warehouse.name, product.presentation ?? unitShort(product.baseUnit))} />
      {entries.length === 0 ? (
        <EmptyState title={t.noHistory} />
      ) : (
        <table className="w-full text-left" aria-label={t.historyCaption}>
          <thead className="text-xs tracking-widest text-ink-muted uppercase">
            <tr>
              <th className="py-2 font-semibold">{t.date}</th>
              <th className="py-2 font-semibold">{t.kind}</th>
              <th className="py-2 text-end font-semibold">{t.change}</th>
              <th className="py-2 text-end font-semibold">{t.balance}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.lineId} className="border-t border-line" data-testid="history-entry">
                <td className="py-2 text-sm">
                  {formatDateTime(new Date(e.createdAt))}
                  <span className="block text-ink-muted">{e.author}</span>
                </td>
                <td className="py-2">
                  <Link href={`/inventario/movimientos/${e.movementId}`} className="font-semibold text-primary hover:underline">
                    {kindLabel(e.kind)}
                  </Link>
                  {e.cancelled ? (
                    <span className="ml-2">
                      <StatusBadge tone="danger">{t.cancelled}</StatusBadge>
                    </span>
                  ) : null}
                </td>
                <td className="py-2 text-end tabular-nums">{formatQuantity(e.delta.startsWith("-") ? e.delta : `+${e.delta}`)}</td>
                <td className={`py-2 text-end tabular-nums ${e.balance.startsWith("-") ? "font-semibold text-danger" : ""}`}>{formatQuantity(e.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {next ? (
        <Link href={`/inventario/historial?almacen=${warehouse.id}&producto=${product.id}&antes=${next}`} className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
          {t.older}
        </Link>
      ) : null}
    </>
  );
}
