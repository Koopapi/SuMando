"use client";

// Spec 003 RF-9, RF-10, RF-26, RF-39 a RF-41: lista de productos con búsqueda, filtros y alta.
import Link from "next/link";
import { useState } from "react";
import { es } from "@/i18n";
import type { ProductView, SupplierView, WarehouseView } from "@/server/services/catalog/views";
import { Alert, Button, DataTable, Dialog, PageHeader, SelectField, StatusBadge, TextField, type Column, type Filter } from "@/ui";
import { formValues } from "../api";
import { countLabel, unitOptions, unitShort } from "./labels";
import { useAction } from "./use-action";

const t = es.catalog;
const tp = es.catalog.products;
const ALL = "*";
const NONE = "-";

export function ProductsManager({ products, suppliers, warehouses }: { products: ProductView[]; suppliers: SupplierView[]; warehouses: WarehouseView[] }) {
  const { run, error, setError, busy, router } = useAction();
  const [creating, setCreating] = useState(false);
  const [supplier, setSupplier] = useState(ALL);
  const active = warehouses.filter((w) => !w.archived);
  const [warehouse, setWarehouse] = useState(active[0]?.id ?? "");

  const rows = products.filter((p) => supplier === ALL || (supplier === NONE ? p.supplier === null : p.supplier?.id === supplier));
  const level = (p: ProductView) => (warehouse ? p.levels[warehouse] : undefined);
  const amount = (p: ProductView, v: string | null | undefined) => (v ? tp.quantity(v, countLabel(p)) : t.none);

  const columns: Column<ProductView>[] = [
    {
      key: "name",
      header: t.name,
      phone: "title",
      cell: (p) => (
        <Link href={`/productos/${p.id}`} className="font-semibold text-primary hover:underline">
          {p.name}
        </Link>
      ),
    },
    { key: "status", header: tp.status, phone: "badge", cell: (p) => (p.archived ? <StatusBadge tone="warning">{t.archivedBadge}</StatusBadge> : null) },
    { key: "unit", header: tp.unit, phone: "primary", cell: (p) => unitShort(p.baseUnit) },
    { key: "supplier", header: tp.supplier, phone: "primary", cell: (p) => (p.supplier ? (p.supplier.archived ? tp.supplierArchived(p.supplier.name) : p.supplier.name) : tp.noSupplier) },
    { key: "min", header: tp.min, cell: (p) => amount(p, level(p)?.min) },
    { key: "max", header: tp.max, cell: (p) => amount(p, level(p)?.max) },
  ];
  const filters: Filter<ProductView>[] = [
    { id: "active", label: tp.filterActive, test: (p) => !p.archived },
    { id: "archived", label: tp.filterArchived, test: (p) => p.archived },
    { id: "withMin", label: tp.filterWithMin, test: (p) => Boolean(level(p)?.min) },
    { id: "withoutMin", label: tp.filterWithoutMin, test: (p) => !level(p)?.min },
  ];

  async function create(form: HTMLFormElement) {
    const v = formValues(form);
    const data = await run<{ product: { id: string } }>("/api/products", { body: { name: v.name, baseUnit: v.baseUnit, supplierId: v.supplierId || null, notes: v.notes } });
    if (data) {
      setCreating(false);
      router.push(`/productos/${data.product.id}`);
    }
  }

  const supplierOptions = [{ value: ALL, label: tp.allSuppliers }, { value: NONE, label: tp.noSupplier }, ...suppliers.map((s) => ({ value: s.id, label: s.archived ? tp.supplierArchived(s.name) : s.name }))];

  return (
    <>
      <PageHeader title={tp.title} subtitle={tp.intro} figure={String(products.filter((p) => !p.archived).length)} figureLabel={tp.figureLabel} action={<Button onClick={() => setCreating(true)}>{tp.create}</Button>} />
      {error && !creating ? <Alert tone="error">{error}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <SelectField label={tp.supplierFilter} value={supplier} onChange={(e) => setSupplier(e.target.value)} options={supplierOptions} />
        <SelectField
          label={tp.warehouseFilter}
          value={warehouse}
          onChange={(e) => setWarehouse(e.target.value)}
          disabled={active.length === 0}
          options={active.length ? active.map((w) => ({ value: w.id, label: w.name })) : [{ value: "", label: tp.noWarehouses }]}
        />
      </div>
      <DataTable
        caption={tp.caption}
        rows={rows}
        columns={columns}
        rowKey={(p) => p.id}
        rowName={(p) => p.name}
        searchFields={(p) => [p.name]}
        searchLabel={tp.search}
        filters={filters}
        initialFilters={["active"]}
        emptyTitle={tp.emptyTitle}
        emptyDescription={tp.emptyDescription}
      />
      <Dialog
        open={creating}
        onClose={() => {
          setCreating(false);
          setError(null);
        }}
        title={tp.createTitle}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void create(e.currentTarget);
          }}
        >
          {error ? <Alert tone="error">{error}</Alert> : null}
          <TextField label={t.name} name="name" required maxLength={80} autoFocus />
          <SelectField label={tp.baseUnit} name="baseUnit" defaultValue="g" options={unitOptions()} />
          <p className="-mt-2 text-sm text-ink-muted">{tp.baseUnitHint}</p>
          <SelectField label={tp.supplier} name="supplierId" defaultValue="" options={[{ value: "", label: tp.noSupplier }, ...suppliers.filter((s) => !s.archived).map((s) => ({ value: s.id, label: s.name }))]} />
          <TextField label={t.notes} name="notes" maxLength={500} hint={t.optional} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreating(false)}>
              {es.common.cancel}
            </Button>
            <Button type="submit" loading={busy}>
              {es.common.save}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
