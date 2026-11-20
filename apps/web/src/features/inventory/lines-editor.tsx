"use client";

// Renglones de un movimiento (spec 005, RF-7, RF-10): producto, cantidad y presentación. Las reglas y el error en
// español los pone el servidor. Spec 014, RF-20 y RF-21: cada renglón es una franja que se abre para editarlo.
import { useState, type ReactNode } from "react";
import { es } from "@/i18n";
import type { ProductOption } from "@/server/services/inventory/views";
import { CaptureRow, ComboField, Icon, NumberField, SectionLabel, SelectField, TextField, formatQuantity } from "@/ui";
import { unitShort } from "../catalog/labels";

const t = es.inventory;

export interface LineDraft {
  key: number;
  productId: string;
  quantity: string;
  presentationId: string;
}

// Arranca en un número distinto en cada carga: los renglones que vuelven de un borrador (spec 015) no chocan con los
// nuevos.
let seq = Date.now();
export const blankLine = (): LineDraft => ({ key: ++seq, productId: "", quantity: "", presentationId: "" });

export const linesBody = (rows: LineDraft[]) => rows.filter((r) => r.productId).map((r) => ({ productId: r.productId, quantity: r.quantity.trim(), presentationId: r.presentationId || null }));

export function LinesEditor({ rows, onChange, products, single = false, signed = false, after }: { rows: LineDraft[]; onChange: (rows: LineDraft[]) => void; products: ProductOption[]; single?: boolean; signed?: boolean; after?: (row: LineDraft) => ReactNode }) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const options = products.map((p) => ({ value: p.id, label: p.name }));
  const [openKey, setOpenKey] = useState<number | null>(() => rows.find((r) => !r.productId)?.key ?? null);
  const set = (key: number, patch: Partial<LineDraft>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  return (
    <section aria-label={t.lines} className="flex flex-col gap-2">
      <SectionLabel as="h2">{t.lines}</SectionLabel>
      <ol className="flex flex-col border-t border-line">
        {rows.map((row, i) => {
          const product = byId.get(row.productId);
          const Quantity = signed ? TextField : NumberField;
          const unit = product ? (product.presentations.find((p) => (p.id ?? "") === row.presentationId)?.name ?? unitShort(product.baseUnit)) : "";
          return (
            <li key={row.key}>
              <CaptureRow
                label={t.lineN(i + 1)}
                summary={product ? `${product.name} · ${row.quantity ? `${signed ? row.quantity : formatQuantity(row.quantity)} ${unit}` : t.noQuantity}` : t.chooseProduct}
                open={single || openKey === row.key}
                onOpen={() => setOpenKey(row.key)}
                onClose={() => setOpenKey(null)}
                onRemove={single ? undefined : () => onChange(rows.filter((r) => r.key !== row.key))}
                removeLabel={t.removeLine(product?.name ?? "")}
              >
                <div className="grid gap-3 lg:grid-cols-12 lg:items-start">
                  <ComboField
                    label={t.product}
                    placeholder={es.requisitions.searchProduct}
                    className="lg:col-span-6"
                    value={row.productId}
                    onChange={(id) => set(row.key, { productId: id, presentationId: byId.get(id)?.countPresentationId ?? "" })}
                    options={options}
                  />
                  <Quantity label={signed ? t.signedQuantity : t.quantity} className="lg:col-span-3" inputMode={signed ? "text" : undefined} value={row.quantity} onChange={(e) => set(row.key, { quantity: e.target.value })} />
                  <SelectField
                    label={t.presentation}
                    className="lg:col-span-3"
                    value={row.presentationId}
                    onChange={(e) => set(row.key, { presentationId: e.target.value })}
                    options={(product?.presentations ?? [{ id: null, name: null, factor: "1" }]).map((p) => ({ value: p.id ?? "", label: p.id ? `${p.name} (${formatQuantity(p.factor)} ${unitShort(product!.baseUnit)})` : product ? unitShort(product.baseUnit) : "—" }))}
                  />
                </div>
              </CaptureRow>
              {after?.(row)}
            </li>
          );
        })}
      </ol>
      {!single ? (
        <button
          type="button"
          onClick={() => {
            const row = blankLine();
            onChange([...rows, row]);
            setOpenKey(row.key);
          }}
          className="inline-flex min-h-12 items-center gap-2 self-start font-semibold text-primary"
        >
          <Icon name="plus" size={18} />
          {t.addLine}
        </button>
      ) : null}
    </section>
  );
}
