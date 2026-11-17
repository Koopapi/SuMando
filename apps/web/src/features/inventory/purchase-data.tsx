"use client";

// Spec 013 RF-17 a RF-22: «Datos de compra» de un almacén. Se cambian proveedor, presentación de compra, mínimo y
// máximo de varios productos y se guardan juntos; el servidor valida cada fila y devuelve los errores de cada una.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { es } from "@/i18n";
import type { PurchaseDataView, PurchaseRow } from "@/server/services/catalog/purchase-data";
import type { WarehouseOption } from "@/server/services/inventory/views";
import { Alert, Button, DataTable, Dialog, EmptyState, NumberField, PageHeader, SelectField, StatusBadge, TextField, formatQuantity, useToast, type Column, type Filter } from "@/ui";
import { api } from "../api";
import { unitShort } from "../catalog/labels";
import { warehouseLabel } from "./labels";

const t = es.inventory.purchaseData;
const NEW = "__new";

interface Edit {
  supplierId?: string | null;
  purchasePresentationId?: string | null;
  min?: string;
  max?: string;
}

export function PurchaseData({ warehouses, view }: { warehouses: WarehouseOption[]; view: PurchaseDataView | null }) {
  const router = useRouter();
  const toast = useToast();
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [creating, setCreating] = useState<PurchaseRow | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const changed = Object.keys(edits).length;

  const edit = (id: string, patch: Edit) => setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));
  const unitOf = (r: PurchaseRow) => r.presentations.find((p) => p.id === r.purchasePresentationId)?.name ?? unitShort(r.baseUnit);

  async function save() {
    if (!view) return;
    setBusy(true);
    setFailure(null);
    const changes = Object.entries(edits).map(([productId, e]) => {
      const row = view.rows.find((r) => r.productId === productId);
      return { productId, ...e, ...(e.min !== undefined || e.max !== undefined ? { levelsIn: row?.purchasePresentationId ?? null } : {}) };
    });
    const result = await api<{ saved: number; errors: { productId: string; message: string }[] }>("/api/purchase-data", { body: { warehouseId: view.warehouse.id, changes } });
    setBusy(false);
    if (!result.ok) return setFailure(result.error.message);
    const failed = new Set(result.data.errors.map((e) => e.productId));
    setErrors(Object.fromEntries(result.data.errors.map((e) => [e.productId, e.message])));
    if (result.data.saved) toast.success(t.saved(result.data.saved));
    if (failed.size) setFailure(t.withErrors(failed.size));
    // Lo guardado deja de estar «cambiado» junto con los datos nuevos del servidor, sin parpadear los anteriores.
    startRefresh(() => {
      router.refresh();
      setEdits((all) => Object.fromEntries(Object.entries(all).filter(([id]) => failed.has(id))));
    });
  }

  const columns: Column<PurchaseRow>[] = [
    {
      key: "name",
      header: t.product,
      phone: "title",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="font-semibold">{r.name}</span>
          <span className="text-sm text-ink-muted tabular-nums">{`${t.stock}: ${formatQuantity(r.stock)} ${unitOf(r)}`}</span>
          {errors[r.productId] ? (
            <span role="alert" className="text-sm font-medium text-danger">
              {errors[r.productId]}
            </span>
          ) : null}
        </span>
      ),
    },
    { key: "edited", header: "", phone: "badge", cell: (r) => (edits[r.productId] ? <StatusBadge tone="warning">{t.edited}</StatusBadge> : null) },
    {
      key: "supplier",
      header: t.supplier,
      phone: "detail",
      cell: (r) => (
        <SelectField
          label={t.supplierOf(r.name)}
          hideLabel
          className="min-w-40"
          value={(edits[r.productId]?.supplierId !== undefined ? edits[r.productId].supplierId : r.supplierId) ?? ""}
          onChange={(e) => edit(r.productId, { supplierId: e.target.value || null })}
          options={[{ value: "", label: t.noSupplier }, ...(view?.suppliers ?? []).map((s) => ({ value: s.id, label: s.name }))]}
        />
      ),
    },
    {
      key: "presentation",
      header: t.presentation,
      phone: "detail",
      cell: (r) => (
        <SelectField
          label={t.presentationOf(r.name)}
          hideLabel
          className="min-w-40"
          value={(edits[r.productId]?.purchasePresentationId !== undefined ? edits[r.productId].purchasePresentationId : r.purchasePresentationId) ?? ""}
          onChange={(e) => (e.target.value === NEW ? setCreating(r) : edit(r.productId, { purchasePresentationId: e.target.value || null }))}
          options={[
            ...r.presentations.map((p) => ({ value: p.id ?? "", label: p.id ? `${p.name} (${formatQuantity(p.factor)} ${unitShort(r.baseUnit)})` : unitShort(r.baseUnit) })),
            { value: NEW, label: t.newPresentation },
          ]}
        />
      ),
    },
    {
      key: "min",
      header: t.min,
      phone: "detail",
      cell: (r) => <NumberField label={t.minOf(r.name)} hideLabel className="w-28" hint={t.inUnit(unitOf(r))} value={edits[r.productId]?.min ?? r.min ?? ""} onChange={(e) => edit(r.productId, { min: e.target.value })} />,
    },
    {
      key: "max",
      header: t.max,
      phone: "detail",
      cell: (r) => <NumberField label={t.maxOf(r.name)} hideLabel className="w-28" hint={t.inUnit(unitOf(r))} value={edits[r.productId]?.max ?? r.max ?? ""} onChange={(e) => edit(r.productId, { max: e.target.value })} />,
    },
  ];

  const rows = view?.rows ?? [];
  const filters: Filter<PurchaseRow>[] = [
    { id: "no-supplier", label: t.filterNoSupplier, test: (r) => r.supplierId === null },
    { id: "no-presentation", label: t.filterNoPresentation, test: (r) => r.purchasePresentationId === null },
    { id: "no-min", label: t.filterNoMin, test: (r) => r.min === null },
    { id: "no-max", label: t.filterNoMax, test: (r) => r.max === null },
    ...(view?.areas ?? []).map((a) => ({ id: `area:${a.id}`, label: t.filterArea(a.name), test: (r: PurchaseRow) => r.area?.id === a.id })),
    ...(view?.suppliers ?? []).filter((s) => rows.some((r) => r.supplierId === s.id)).map((s) => ({ id: `supplier:${s.id}`, label: t.filterSupplier(s.name), test: (r: PurchaseRow) => r.supplierId === s.id })),
  ];

  return (
    <>
      <PageHeader title={t.title} subtitle={t.intro} figure={String(rows.length)} figureLabel={t.figureLabel} />
      {warehouses.length === 0 ? (
        <EmptyState title={t.noWarehouses} />
      ) : (
        <SelectField
          label={t.warehouse}
          className="lg:max-w-md"
          value={view?.warehouse.id ?? ""}
          onChange={(e) => {
            setEdits({});
            setErrors({});
            router.push(`/inventario/datos-de-compra?almacen=${e.target.value}`);
          }}
          options={warehouses.map((w) => ({ value: w.id, label: warehouseLabel(w) }))}
        />
      )}
      {failure ? <Alert tone="error">{failure}</Alert> : null}
      {view ? (
        <DataTable
          caption={t.caption}
          rows={rows}
          columns={columns}
          rowKey={(r) => r.productId}
          rowName={(r) => r.name}
          searchFields={(r) => [r.name]}
          searchLabel={t.search}
          filters={filters}
          emptyTitle={t.empty}
        />
      ) : null}
      {changed ? (
        <div className="sticky bottom-(--nav-space) -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface px-4 py-3 lg:bottom-0 lg:mx-0 lg:rounded-md lg:border">
          <span className="flex-1 text-sm font-semibold">{t.changes(changed)}</span>
          <Button
            variant="secondary"
            onClick={() => {
              setEdits({});
              setErrors({});
              setFailure(null);
            }}
          >
            {t.discard}
          </Button>
          <Button loading={busy || refreshing} onClick={() => void save()}>
            {t.save(changed)}
          </Button>
        </div>
      ) : null}
      {creating ? (
        <NewPresentation
          row={creating}
          onClose={() => setCreating(null)}
          onCreated={(id) => {
            edit(creating.productId, { purchasePresentationId: id });
            setCreating(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

/** RF-20: presentación nueva del producto con nombre y equivalencia (spec 003); queda elegida como de compra. */
function NewPresentation({ row, onClose, onCreated }: { row: PurchaseRow; onClose: () => void; onCreated: (id: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const unit = unitShort(row.baseUnit);
  return (
    <Dialog open title={t.newPresentationTitle(row.name)} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          setBusy(true);
          const result = await api<{ presentation: { id: string } }>(`/api/products/${row.productId}/presentations`, { body: { name: String(data.get("name") ?? ""), factor: String(data.get("factor") ?? "") } });
          setBusy(false);
          if (!result.ok) return setError(result.error.message);
          onCreated(result.data.presentation.id);
        }}
      >
        <p className="text-sm text-ink-muted">{t.newPresentationIntro(unit)}</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <TextField label={t.presentationName} name="name" required maxLength={80} autoFocus />
        <NumberField label={t.presentationFactor(unit)} name="factor" required />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {es.common.cancel}
          </Button>
          <Button type="submit" loading={busy}>
            {es.common.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
