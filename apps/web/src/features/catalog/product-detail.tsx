"use client";

// Spec 003 RF-9, RF-11, RF-12, RF-15 a RF-17, RF-22, RF-23, RF-26, RF-33 a RF-35: un producto con sus datos,
// presentaciones, uso para comprar y contar, y mínimos y máximos por almacén.
import Link from "next/link";
import { useState } from "react";
import { es } from "@/i18n";
import type { PresentationView, ProductView, SupplierView, WarehouseView } from "@/server/services/catalog/views";
import type { ProductStockView } from "@/server/services/inventory/views";
import { Alert, Button, Dialog, Icon, NumberField, PageHeader, SectionLabel, SelectField, StatusBadge, TextField, formatQuantity } from "@/ui";
import { formValues } from "../api";
import { countLabel, presentationLabel, unitShort } from "./labels";
import { useAction } from "./use-action";

const t = es.catalog;
const tp = es.catalog.products;
const td = es.catalog.detail;
const BASE = "base";

type Mode = { kind: "data" } | { kind: "addPresentation" } | { kind: "editPresentation"; presentation: PresentationView } | { kind: "level"; warehouse: WarehouseView } | null;

export function ProductDetail({ product, suppliers, warehouses, recipes = [], stock = [] }: { product: ProductView; suppliers: SupplierView[]; warehouses: WarehouseView[]; recipes?: { id: string; name: string }[]; stock?: ProductStockView[] }) {
  const { run, error, setError, busy } = useAction();
  const [mode, setMode] = useState<Mode>(null);
  const unit = unitShort(product.baseUnit);
  const label = (p: PresentationView) => presentationLabel(p, product.baseUnit);
  const presentationOptions = product.presentations.map((p) => ({ value: p.id ?? BASE, label: label(p) }));
  const fromOption = (v: string) => (v === BASE ? null : v);
  const active = warehouses.filter((w) => !w.archived);
  const path = `/api/products/${product.id}`;

  const close = () => {
    setMode(null);
    setError(null);
  };

  async function submit(form: HTMLFormElement) {
    if (!mode) return;
    const v = formValues(form);
    const done =
      mode.kind === "data"
        ? await run(path, { method: "PATCH", body: { name: v.name, supplierId: v.supplierId || null, notes: v.notes } })
        : mode.kind === "addPresentation"
          ? await run(`${path}/presentations`, { body: { name: v.name, factor: v.factor } })
          : mode.kind === "editPresentation"
            ? await run(`/api/presentations/${mode.presentation.id}`, { method: "PATCH", body: { name: v.name, factor: v.factor } })
            : await run(`${path}/levels`, { method: "PUT", body: { warehouseId: mode.warehouse.id, presentationId: fromOption(v.presentationId), min: v.min, max: v.max } });
    if (done) setMode(null);
  }

  // RF-35: el proveedor archivado sigue a la vista como opción actual, pero no se ofrece a otros productos.
  const supplierOptions = [
    { value: "", label: tp.noSupplier },
    ...suppliers.filter((s) => !s.archived || s.id === product.supplier?.id).map((s) => ({ value: s.id, label: s.archived ? tp.supplierArchived(s.name) : s.name })),
  ];
  const level = mode?.kind === "level" ? product.levels[mode.warehouse.id] : undefined;

  return (
    <>
      <PageHeader
        title={product.name}
        subtitle={es.catalog.unitOption(t.units[product.baseUnit], unit)}
        action={
          product.archived ? (
            <Button onAction={() => run(`/api/catalog/products/${product.id}/reactivate`)}>{t.reactivate}</Button>
          ) : (
            <Button variant="secondary" onAction={() => run(`/api/catalog/products/${product.id}/archive`)}>
              {t.archive}
            </Button>
          )
        }
      />
      <Link href="/productos" className="inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-primary">
        <Icon name="arrowLeft" size={18} />
        {td.back}
      </Link>
      {error && !mode ? <Alert tone="error">{error}</Alert> : null}
      {product.archived ? <StatusBadge tone="warning">{t.archivedBadge}</StatusBadge> : null}

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <section aria-label={td.data} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel as="h2">{td.data}</SectionLabel>
            <Button variant="ghost" aria-label={t.actionFor(t.edit, product.name)} onClick={() => setMode({ kind: "data" })}>
              {t.edit}
            </Button>
          </div>
          <dl className="flex flex-col">
            {[
              [tp.baseUnit, es.catalog.unitOption(t.units[product.baseUnit], unit)],
              [tp.supplier, product.supplier ? (product.supplier.archived ? tp.supplierArchived(product.supplier.name) : product.supplier.name) : tp.noSupplier],
              [t.notes, product.notes ?? t.none],
            ].map(([k, v]) => (
              <div key={k} className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 border-b border-line py-2">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-label={td.presentations} className="flex flex-col gap-2">
          <SectionLabel as="h2">{td.presentations}</SectionLabel>
          <p className="text-sm text-ink-muted">
            {td.presentationsIntro}
          </p>
          <ul className="flex flex-col" data-testid="presentations">
            {product.presentations.map((p) => (
              <li key={p.id ?? BASE} className="flex min-h-13 flex-wrap items-center gap-x-2 border-b border-line py-1">
                <span className="flex flex-1 flex-wrap items-center gap-2 font-semibold">
                  {p.id ? td.equivalence(label(p), p.factor, unit) : td.basePresentation(unit)}
                  {product.purchasePresentationId === p.id ? <StatusBadge tone="neutral">{td.purchaseBadge}</StatusBadge> : null}
                  {product.countPresentationId === p.id ? <StatusBadge tone="success">{td.countBadge}</StatusBadge> : null}
                </span>
                {p.id ? (
                  <Button variant="ghost" aria-label={t.actionFor(t.edit, label(p))} onClick={() => setMode({ kind: "editPresentation", presentation: p })}>
                    {t.edit}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setMode({ kind: "addPresentation" })} className="inline-flex min-h-12 items-center gap-2 self-start font-semibold text-primary">
            <Icon name="plus" size={18} />
            {td.addPresentation}
          </button>
          <form
            key={`${product.purchasePresentationId}-${product.countPresentationId}-${product.presentations.length}`}
            className="flex flex-col gap-3 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = formValues(e.currentTarget);
              void run(path, { method: "PATCH", body: { purchasePresentationId: fromOption(v.purchase), countPresentationId: fromOption(v.count) } });
            }}
          >
            <SectionLabel as="h3">{td.uses}</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label={td.purchase} name="purchase" defaultValue={product.purchasePresentationId ?? BASE} options={presentationOptions} />
              <SelectField label={td.count} name="count" defaultValue={product.countPresentationId ?? BASE} options={presentationOptions} />
            </div>
            <p className="text-sm text-ink-muted">{td.usesHint}</p>
            <Button type="submit" variant="secondary" loading={busy} className="self-start">
              {td.saveUses}
            </Button>
          </form>
        </section>
      </div>

      <section aria-label={td.levels} className="flex flex-col gap-2">
        <SectionLabel as="h2">{td.levels}</SectionLabel>
        <p className="text-sm text-ink-muted">
          {td.levelsIntro(countLabel(product))}
        </p>
        {active.length === 0 ? (
          <p className="flex flex-wrap items-center gap-3 text-ink-muted">
            {td.noWarehouses}
            <Link href="/almacenes" className="inline-flex min-h-11 items-center font-semibold text-primary">
              {td.goWarehouses}
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col lg:max-w-3xl" data-testid="levels">
            {active.map((w) => {
              const l = product.levels[w.id];
              return (
                <li key={w.id} data-warehouse={w.name} className="flex min-h-13 items-center gap-3 border-b border-line py-2">
                  <span className="flex min-w-0 flex-1 flex-col gap-1 lg:flex-row lg:items-center lg:gap-4">
                    <span className="flex flex-wrap items-center gap-2 font-semibold lg:flex-1">
                      {w.name}
                      <StatusBadge tone="neutral">{w.scope === "branch" ? es.catalog.places.branchBadge : es.catalog.places.businessBadge}</StatusBadge>
                    </span>
                    <span className="flex flex-wrap gap-x-4 text-sm text-ink-muted lg:text-ink">
                      <span data-testid="level-min">{td.minValue(l?.min ? tp.quantity(l.min, countLabel(product)) : t.none)}</span>
                      <span data-testid="level-max">{td.maxValue(l?.max ? tp.quantity(l.max, countLabel(product)) : t.none)}</span>
                    </span>
                  </span>
                  <Button variant="ghost" aria-label={td.levelOf(w.name)} onClick={() => setMode({ kind: "level", warehouse: w })}>
                    {td.setLevel}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label={es.inventory.productStock} className="flex flex-col gap-2">
        <SectionLabel as="h2">{es.inventory.productStock}</SectionLabel>
        {stock.length === 0 ? (
          <p className="text-sm text-ink-muted">{es.inventory.productStockNone}</p>
        ) : (
          <ul className="flex flex-col lg:max-w-3xl" data-testid="product-stock">
            {stock.map((s) => (
              <li key={s.warehouseId} className="flex min-h-12 items-center gap-3 border-b border-line">
                <Link href={`/inventario/historial?almacen=${s.warehouseId}&producto=${product.id}`} className="min-w-0 flex-1 font-semibold text-primary hover:underline">
                  {s.warehouseName}
                </Link>
                {s.status === "negative" ? <StatusBadge tone="danger">{es.inventory.negative}</StatusBadge> : s.status === "below_min" ? <StatusBadge tone="warning">{es.inventory.belowMin}</StatusBadge> : null}
                <span className={`tabular-nums ${s.status === "negative" ? "font-semibold text-danger" : ""}`}>{es.inventory.quantityWith(formatQuantity(s.quantity), countLabel(product))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label={es.recipes.usedIn} className="flex flex-col gap-2">
        <SectionLabel as="h2">{es.recipes.usedIn}</SectionLabel>
        {recipes.length === 0 ? (
          <p className="text-sm text-ink-muted">{es.recipes.usedInNone}</p>
        ) : (
          <ul className="flex flex-col lg:max-w-3xl" data-testid="used-in">
            {recipes.map((r) => (
              <li key={r.id} className="flex min-h-12 items-center border-b border-line">
                <Link href={`/recetas/${r.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">
                  {r.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={mode !== null}
        onClose={close}
        title={
          mode?.kind === "data"
            ? tp.editTitle(product.name)
            : mode?.kind === "addPresentation"
              ? td.addPresentationTitle
              : mode?.kind === "editPresentation"
                ? td.editPresentationTitle(label(mode.presentation))
                : mode?.kind === "level"
                  ? td.levelTitle(mode.warehouse.name)
                  : ""
        }
      >
        {mode ? (
          <form
            key={mode.kind}
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(e.currentTarget);
            }}
          >
            {error ? <Alert tone="error">{error}</Alert> : null}
            {mode.kind === "data" ? (
              <>
                <TextField label={t.name} name="name" required maxLength={80} autoFocus defaultValue={product.name} />
                <p className="text-sm text-ink-muted">{tp.baseUnitLocked}</p>
                <SelectField label={tp.supplier} name="supplierId" defaultValue={product.supplier?.id ?? ""} options={supplierOptions} />
                <TextField label={t.notes} name="notes" maxLength={500} defaultValue={product.notes ?? ""} hint={t.optional} />
              </>
            ) : null}
            {mode.kind === "addPresentation" || mode.kind === "editPresentation" ? (
              <>
                <TextField label={td.presentationName} name="name" required maxLength={80} autoFocus hint={td.presentationNameHint} defaultValue={mode.kind === "editPresentation" ? (mode.presentation.name ?? "") : ""} />
                <NumberField label={td.factor(unit)} name="factor" required hint={td.factorHint} defaultValue={mode.kind === "editPresentation" ? mode.presentation.factor : ""} />
              </>
            ) : null}
            {mode.kind === "level" ? (
              <>
                <SelectField label={td.captureIn} name="presentationId" defaultValue={product.countPresentationId ?? BASE} options={presentationOptions} />
                <NumberField label={tp.min} name="min" hint={td.minHint} defaultValue={level?.min ?? ""} autoFocus />
                <NumberField label={tp.max} name="max" hint={td.minHint} defaultValue={level?.max ?? ""} />
              </>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>
                {es.common.cancel}
              </Button>
              <Button type="submit" loading={busy}>
                {es.common.save}
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </>
  );
}
