"use client";

// Renglones de una requisición agrupados por proveedor (spec 013, RF-29 a RF-31; spec 014, RF-20 y RF-21): los usan
// la pantalla completa y el asistente «Nueva requisición» (spec 015, RF-29), así que se ven y se capturan igual.
import type { ReactNode } from "react";
import { es } from "@/i18n";
import type { ProductOption } from "@/server/services/inventory/views";
import type { BuilderLevels } from "@/server/services/requisitions/requisitions";
import { CaptureRow, ComboField, NumberField, SelectField, formatQuantity } from "@/ui";
import { unitShort } from "../catalog/labels";

const t = es.requisitions;

export interface Row {
  key: number;
  productId: string;
  quantity: string;
  presentationId: string;
  supplierId: string;
}

export type BuilderProduct = ProductOption & { supplierId: string | null; purchasePresentationId: string | null };

let seq = 0;
export const blank = (): Row => ({ key: ++seq, productId: "", quantity: "", presentationId: "", supplierId: "" });
export const fromDraft = (d: { productId: string; quantity: string; presentationId: string | null; supplierId: string | null }): Row => ({ key: ++seq, productId: d.productId, quantity: d.quantity, presentationId: d.presentationId ?? "", supplierId: d.supplierId ?? "" });
/** Renglones guardados en un borrador: llaves nuevas para no chocar con las que se creen después. */
export const restoreRows = (rows: Row[]): Row[] => rows.map((r) => ({ ...r, key: ++seq }));
export const lineBody = (rows: Row[]) => rows.filter((r) => r.productId).map((r) => ({ productId: r.productId, quantity: r.quantity.trim(), presentationId: r.presentationId || null, supplierId: r.supplierId || null }));

export interface LinesProps {
  rows: Row[];
  setRows: (fn: (rows: Row[]) => Row[]) => void;
  warehouseId: string;
  levels: BuilderLevels;
  products: BuilderProduct[];
  suppliers: { id: string; name: string }[];
  openKey: number | null;
  setOpenKey: (key: number | null) => void;
  /** Debajo de cada renglón (el aviso de dato raro del asistente). */
  after?: (row: Row) => ReactNode;
}

export function levelOf(levels: BuilderLevels, warehouseId: string, row: Pick<Row, "productId" | "presentationId">) {
  return levels[warehouseId]?.[row.productId]?.[row.presentationId];
}

export function unitOf(product: BuilderProduct | undefined, presentationId: string) {
  return product ? (product.presentations.find((x) => (x.id ?? "") === presentationId)?.name ?? unitShort(product.baseUnit)) : "";
}

export function RequisitionLines({ rows, setRows, warehouseId, levels, products, suppliers, openKey, setOpenKey, after }: LinesProps) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const supplierName = new Map(suppliers.map((x) => [x.id, x.name]));
  const productOptions = products.map((p) => ({ value: p.id, label: p.name, hint: p.supplierId ? supplierName.get(p.supplierId) : undefined }));
  const set = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  return (
    <>
      {groupsOf(rows, supplierName).map((grp) => (
            <section key={grp.key} aria-label={grp.label ?? t.newLines} className="flex flex-col" data-testid="builder-group">
              {grp.label ? (
                <h3 className="flex items-baseline justify-between gap-2 border-b-2 border-line-strong pt-3 pb-1 font-brand text-lg font-bold">
                  <span>{grp.label}</span>
                  <span className="text-sm font-semibold text-ink-muted">{t.groupCount(grp.rows.length)}</span>
                </h3>
              ) : null}
              <ol className="flex flex-col">
                {grp.rows.map(({ row, index }) => {
                  const product = byId.get(row.productId);
                  const level = product ? levelOf(levels, warehouseId, row) : undefined;
                  const unit = unitOf(product, row.presentationId);
                  return (
                    <li key={row.key}>
                      <CaptureRow
                        label={t.lineN(index + 1)}
                        summary={product ? [product.name, row.quantity ? `${formatQuantity(row.quantity)} ${unit}` : t.noQuantity, row.supplierId ? supplierName.get(row.supplierId) : t.noSupplier].filter(Boolean).join(" · ") : t.chooseProduct}
                        detail={product ? <span data-testid="builder-level">{t.levelLine(formatQuantity(level?.stock ?? "0"), level?.min ? formatQuantity(level.min) : null, level?.max ? formatQuantity(level.max) : null, unit)}</span> : undefined}
                        open={openKey === row.key}
                        onOpen={() => setOpenKey(row.key)}
                        onClose={() => setOpenKey(null)}
                        onRemove={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                        removeLabel={t.removeLine(product?.name ?? "")}
                      >
                        <div className="grid grid-cols-6 gap-x-3 gap-y-2 lg:grid-cols-12 lg:items-start">
                          <ComboField
                            label={t.product}
                            placeholder={t.searchProduct}
                            className="col-span-6 lg:col-span-4"
                            value={row.productId}
                            onChange={(id) => {
                              const p = byId.get(id);
                              set(row.key, { productId: id, presentationId: p?.purchasePresentationId ?? "", supplierId: p?.supplierId ?? "" });
                            }}
                            options={productOptions}
                          />
                          <NumberField label={t.quantity} className="col-span-2 lg:col-span-2" value={row.quantity} onChange={(e) => set(row.key, { quantity: e.target.value })} />
                          <SelectField
                            label={t.presentation}
                            className="col-span-4 lg:col-span-3"
                            value={row.presentationId}
                            onChange={(e) => set(row.key, { presentationId: e.target.value })}
                            options={(product?.presentations ?? [{ id: null, name: null, factor: "1" }]).map((p) => ({ value: p.id ?? "", label: p.id ? `${p.name} (${formatQuantity(p.factor)} ${unitShort(product!.baseUnit)})` : product ? unitShort(product.baseUnit) : "—" }))}
                          />
                          <SelectField label={t.supplier} className="col-span-6 lg:col-span-3" value={row.supplierId} onChange={(e) => set(row.key, { supplierId: e.target.value })} options={[{ value: "", label: t.noSupplier }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
                          {product ? (
                            <p className="col-span-6 text-sm text-ink-muted tabular-nums lg:col-span-12">
                              {t.levelLine(formatQuantity(level?.stock ?? "0"), level?.min ? formatQuantity(level.min) : null, level?.max ? formatQuantity(level.max) : null, unit)}
                            </p>
                          ) : null}
                        </div>
                      </CaptureRow>
                      {after?.(row)}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
    </>
  );
}

/** RF-31: los renglones con producto, agrupados por proveedor en orden de nombre, con «Sin proveedor» al final; los
 * renglones aún vacíos van al final, sin título. Solo agrupa lo que ya está en pantalla. */
export function groupsOf(rows: Row[], supplierName: Map<string, string>) {
  const groups = new Map<string, { key: string; label: string | null; rows: { row: Row; index: number }[] }>();
  rows.forEach((row, index) => {
    const key = !row.productId ? "blank" : row.supplierId && supplierName.has(row.supplierId) ? row.supplierId : "none";
    if (!groups.has(key)) groups.set(key, { key, label: key === "blank" ? null : key === "none" ? t.noSupplier : supplierName.get(key)!, rows: [] });
    groups.get(key)!.rows.push({ row, index });
  });
  const rank = (k: string) => (k === "blank" ? 2 : k === "none" ? 1 : 0);
  return [...groups.values()].sort((a, b) => rank(a.key) - rank(b.key) || (a.label ?? "").localeCompare(b.label ?? "", "es"));
}
