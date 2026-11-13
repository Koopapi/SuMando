"use client";

// Renglones de un movimiento (spec 005, RF-7, RF-10): producto, cantidad y presentación. Las reglas y el error en
// español los pone el servidor.
import { es } from "@/i18n";
import type { ProductOption } from "@/server/services/inventory/views";
import { Button, Icon, NumberField, SectionLabel, SelectField, TextField } from "@/ui";
import { unitShort } from "../catalog/labels";

const t = es.inventory;

export interface LineDraft {
  key: number;
  productId: string;
  quantity: string;
  presentationId: string;
}

let seq = 0;
export const blankLine = (): LineDraft => ({ key: ++seq, productId: "", quantity: "", presentationId: "" });

export const linesBody = (rows: LineDraft[]) => rows.filter((r) => r.productId).map((r) => ({ productId: r.productId, quantity: r.quantity.trim(), presentationId: r.presentationId || null }));

export function LinesEditor({ rows, onChange, products, single = false, signed = false }: { rows: LineDraft[]; onChange: (rows: LineDraft[]) => void; products: ProductOption[]; single?: boolean; signed?: boolean }) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const set = (key: number, patch: Partial<LineDraft>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  return (
    <section aria-label={t.lines} className="flex flex-col gap-3">
      <SectionLabel as="h2">{t.lines}</SectionLabel>
      <ol className="flex flex-col">
        {rows.map((row, i) => {
          const product = byId.get(row.productId);
          const Quantity = signed ? TextField : NumberField;
          return (
            <li key={row.key} className="border-t border-line py-3">
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-2 text-xs font-semibold tracking-widest text-ink-muted uppercase">{t.lineN(i + 1)}</legend>
                <div className="grid gap-3 lg:grid-cols-12 lg:items-start">
                  <SelectField
                    label={t.product}
                    className="lg:col-span-5"
                    value={row.productId}
                    onChange={(e) => {
                      const p = byId.get(e.target.value);
                      set(row.key, { productId: e.target.value, presentationId: p?.countPresentationId ?? "" });
                    }}
                    options={[{ value: "", label: t.chooseProduct }, ...products.map((p) => ({ value: p.id, label: p.name }))]}
                  />
                  <Quantity label={signed ? t.signedQuantity : t.quantity} className="lg:col-span-3" inputMode={signed ? "text" : undefined} value={row.quantity} onChange={(e) => set(row.key, { quantity: e.target.value })} />
                  <SelectField
                    label={t.presentation}
                    className="lg:col-span-3"
                    value={row.presentationId}
                    onChange={(e) => set(row.key, { presentationId: e.target.value })}
                    options={(product?.presentations ?? [{ id: null, name: null, factor: "1" }]).map((p) => ({ value: p.id ?? "", label: p.id ? `${p.name} (${p.factor} ${unitShort(product!.baseUnit)})` : product ? unitShort(product.baseUnit) : "—" }))}
                  />
                  {!single ? (
                    <div className="flex lg:col-span-1 lg:pt-7">
                      <Button variant="ghost" aria-label={t.removeLine(product?.name ?? "")} onClick={() => onChange(rows.filter((r) => r.key !== row.key))}>
                        <Icon name="trash" size={18} />
                        <span className="lg:sr-only">{t.remove}</span>
                      </Button>
                    </div>
                  ) : null}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>
      {!single ? (
        <button type="button" onClick={() => onChange([...rows, blankLine()])} className="inline-flex min-h-12 items-center gap-2 self-start font-semibold text-primary">
          <Icon name="plus" size={18} />
          {t.addLine}
        </button>
      ) : null}
    </section>
  );
}
