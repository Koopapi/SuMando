"use client";

// Spec 005 RF-2, RF-9, RF-21, RF-55 a RF-57, RF-59: existencias del almacén elegido con búsqueda y filtros.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { es } from "@/i18n";
import type { StockRow, WarehouseOption } from "@/server/services/inventory/views";
import { Alert, DataTable, formatQuantity, EmptyState, LinkButton, PageHeader, SelectField, StatusBadge, type Column, type Filter } from "@/ui";
import { measureLabel, warehouseLabel, withMeasure } from "./labels";

const t = es.inventory;

export function StockView({ warehouses, warehouse, rows, pending }: { warehouses: WarehouseOption[]; warehouse: WarehouseOption | null; rows: StockRow[]; pending: number }) {
  const router = useRouter();
  const below = rows.filter((r) => r.status === "below_min").length;
  const q = warehouse ? `?almacen=${warehouse.id}` : "";
  const columns: Column<StockRow>[] = [
    {
      key: "name",
      header: t.product,
      phone: "title",
      cell: (r) => (
        <Link href={`/inventario/historial?almacen=${warehouse?.id}&producto=${r.productId}`} className="font-semibold text-primary hover:underline">
          {r.name}
        </Link>
      ),
    },
    {
      key: "status",
      header: t.status,
      phone: "badge",
      cell: (r) => (
        <span className="flex flex-wrap gap-1">
          {r.status === "negative" ? <StatusBadge tone="danger">{t.negative}</StatusBadge> : null}
          {r.status === "below_min" ? <StatusBadge tone="warning">{t.belowMin}</StatusBadge> : null}
          {r.archived ? <StatusBadge tone="neutral">{t.archived}</StatusBadge> : null}
        </span>
      ),
    },
    {
      key: "stock",
      header: t.stock,
      phone: "primary",
      align: "end",
      cell: (r) => <span className={`tabular-nums ${r.status === "negative" ? "font-semibold text-danger" : ""}`}>{withMeasure(r.quantity, r)}</span>,
    },
    { key: "min", header: t.min, align: "end", cell: (r) => <span className="tabular-nums">{r.min ? formatQuantity(r.min) : "—"}</span> },
    { key: "max", header: t.max, align: "end", cell: (r) => <span className="tabular-nums">{r.max ? formatQuantity(r.max) : "—"}</span> },
    { key: "area", header: t.area, phone: "detail", cell: (r) => <span className="text-sm text-ink-muted">{r.area ?? t.noArea}</span> },
  ];
  const areas = [...new Set(rows.map((r) => r.area).filter((a): a is string => a !== null))].sort((a, b) => a.localeCompare(b, "es"));
  const filters: Filter<StockRow>[] = [
    { id: "below", label: t.filterBelowMin, test: (r) => r.status === "below_min" },
    { id: "negative", label: t.filterNegative, test: (r) => r.status === "negative" },
    ...areas.map((a) => ({ id: `area:${a}`, label: t.filterArea(a), test: (r: StockRow) => r.area === a })),
  ];
  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={t.intro}
        figure={String(below)}
        figureLabel={t.figureLabel}
        action={
          <span className="flex flex-wrap gap-2">
            <LinkButton href={`/inventario/entrada${q}`} icon="plus">
              {t.entry}
            </LinkButton>
            <LinkButton href={`/inventario/salida${q}`} variant="secondary" icon="minus">
              {t.exit}
            </LinkButton>
            <LinkButton href={`/inventario/conteo`} variant="secondary" icon="clipboard">
              {t.count}
            </LinkButton>
          </span>
        }
      />
      <nav aria-label={t.actions} className="flex flex-wrap gap-x-6 gap-y-1">
        <Link href={`/inventario/ajuste${q}`} className="inline-flex min-h-11 items-center font-semibold text-primary">
          {t.adjustment}
        </Link>
        <Link href={`/inventario/traspaso${q}`} className="inline-flex min-h-11 items-center font-semibold text-primary">
          {t.transfer}
        </Link>
        <Link href="/inventario/traspasos" className="inline-flex min-h-11 items-center font-semibold text-primary">
          {t.transfers}
        </Link>
        <Link href="/inventario/movimientos" className="inline-flex min-h-11 items-center font-semibold text-primary">
          {t.movements}
        </Link>
      </nav>
      {pending > 0 ? (
        <Alert tone="info">
          <Link href="/inventario/traspasos" className="font-semibold underline">
            {t.pendingTransfers(pending)}
          </Link>
        </Alert>
      ) : null}
      {warehouses.length === 0 || !warehouse ? (
        <EmptyState title={t.noWarehouses} description={t.noWarehousesHint} action={<LinkButton href="/almacenes">{t.places}</LinkButton>} />
      ) : (
        <>
          <SelectField label={t.warehouse} className="lg:max-w-md" value={warehouse.id} onChange={(e) => router.push(`/inventario?almacen=${e.target.value}`)} options={warehouses.map((w) => ({ value: w.id, label: warehouseLabel(w) }))} />
          {rows.length === 0 ? (
            <EmptyState title={t.emptyTitle} description={t.emptyDescription} />
          ) : (
            <DataTable caption={t.caption(warehouse.name)} rows={rows} columns={columns} rowKey={(r) => r.productId} rowName={(r) => `${r.name} ${measureLabel(r)}`} searchFields={(r) => [r.name]} searchLabel={t.search} filters={filters} />
          )}
        </>
      )}
    </>
  );
}
