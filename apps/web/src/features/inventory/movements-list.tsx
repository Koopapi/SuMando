// Spec 005 RF-62: movimientos de los almacenes visibles con filtros por tipo, almacén y fechas, de 50 en 50;
// spec 014 RF-13: agrupados por día.
import Link from "next/link";
import { es } from "@/i18n";
import type { MovementSummaryView, WarehouseOption } from "@/server/services/inventory/views";
import { Button, CollapsibleGroup, EmptyState, PageHeader, SelectField, StatusBadge, TextField, formatDate, formatDateTime } from "@/ui";
import { kindLabel, reasonLabel, warehouseLabel } from "./labels";

const t = es.inventory;

export interface MovementFilters {
  tipo?: string;
  almacen?: string;
  desde?: string;
  hasta?: string;
}

export function MovementsList({ movements, next, warehouses, filters }: { movements: MovementSummaryView[]; next: string | null; warehouses: WarehouseOption[]; filters: MovementFilters }) {
  const query = (extra: Record<string, string>) => new URLSearchParams(Object.entries({ ...filters, ...extra }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <>
      <Link href="/inventario" className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
        {t.back}
      </Link>
      <PageHeader title={t.movementsTitle} subtitle={t.movementsIntro} />
      <form method="get" className="grid gap-3 lg:grid-cols-5 lg:items-end">
        <SelectField label={t.kind} name="tipo" defaultValue={filters.tipo ?? ""} options={[{ value: "", label: t.allKinds }, ...Object.entries(t.kinds).map(([value, label]) => ({ value, label }))]} />
        <SelectField label={t.warehouse} name="almacen" defaultValue={filters.almacen ?? ""} options={[{ value: "", label: t.allWarehouses }, ...warehouses.map((w) => ({ value: w.id, label: warehouseLabel(w) }))]} />
        <TextField label={t.fromDate} name="desde" type="date" defaultValue={filters.desde ?? ""} />
        <TextField label={t.toDate} name="hasta" type="date" defaultValue={filters.hasta ?? ""} />
        <Button type="submit" variant="secondary">
          {t.filter}
        </Button>
      </form>
      {movements.length === 0 ? (
        <EmptyState title={t.noMovements} />
      ) : (
        <div className="flex flex-col gap-2" aria-label={t.movementsCaption} role="group">
          {byDay(movements).map(([day, list]) => (
            <CollapsibleGroup key={day} label={day} count={list.length}>
              <ul className="flex flex-col">
                {list.map((m) => (
                  <li key={m.id} className="border-b border-line">
                    <Link href={`/inventario/movimientos/${m.id}`} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 py-2 hover:bg-primary-soft">
                      <span className="font-semibold text-primary">{kindLabel(m.kind)}</span>
                      {m.reason ? <span className="text-sm">{reasonLabel(m.reason)}</span> : null}
                      {m.cancelled ? <StatusBadge tone="danger">{t.cancelled}</StatusBadge> : null}
                      <span className="basis-full text-sm text-ink-muted lg:ml-auto lg:basis-auto">{`${t.movementLine(m.warehouseName, formatDateTime(new Date(m.createdAt)), m.author)} · ${t.linesValue(m.lines)}`}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CollapsibleGroup>
          ))}
        </div>
      )}
      {next ? (
        <Link href={`/inventario/movimientos?${query({ antes: next })}`} className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
          {t.older}
        </Link>
      ) : null}
    </>
  );
}

/** RF-13: los movimientos de esta tanda agrupados por día, del más reciente al más antiguo. */
function byDay(movements: MovementSummaryView[]): [string, MovementSummaryView[]][] {
  const days = new Map<string, MovementSummaryView[]>();
  for (const m of movements) {
    const day = formatDate(new Date(m.createdAt));
    days.set(day, [...(days.get(day) ?? []), m]);
  }
  return [...days.entries()];
}
