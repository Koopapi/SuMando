"use client";

// Spec 007 RF-7 a RF-24: armar una requisición desde los mínimos, un cálculo, una plantilla o a mano, y enviarla (o
// guardar los cambios si se edita). Sugerencias, sumas y reglas las decide el servidor.
// Spec 013 RF-29 a RF-32: el producto se busca escribiendo, cada renglón muestra existencia, mínimo y máximo, y los
// renglones se ven agrupados por proveedor.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { ProductOption, WarehouseOption } from "@/server/services/inventory/views";
import type { BuilderLevels } from "@/server/services/requisitions/requisitions";
import type { DraftLine } from "@/server/services/requisitions/views";
import { Alert, Button, ComboField, Dialog, Icon, NumberField, PageHeader, SectionLabel, SelectField, TextArea, TextField, formatQuantity } from "@/ui";
import { api } from "../api";
import { unitShort } from "../catalog/labels";
import { warehouseLabel } from "../inventory/labels";

const t = es.requisitions;

interface Row {
  key: number;
  productId: string;
  quantity: string;
  presentationId: string;
  supplierId: string;
}

let seq = 0;
const blank = (): Row => ({ key: ++seq, productId: "", quantity: "", presentationId: "", supplierId: "" });
const fromDraft = (d: { productId: string; quantity: string; presentationId: string | null; supplierId: string | null }): Row => ({ key: ++seq, productId: d.productId, quantity: d.quantity, presentationId: d.presentationId ?? "", supplierId: d.supplierId ?? "" });

export interface BuilderProps {
  warehouses: WarehouseOption[];
  /** Spec 013, RF-30: existencia, mínimo y máximo por almacén, producto y presentación. */
  levels: BuilderLevels;
  products: (ProductOption & { supplierId: string | null; purchasePresentationId: string | null })[];
  suppliers: { id: string; name: string }[];
  calculations: { id: string; label: string }[];
  templates: { id: string; name: string }[];
  owner: boolean;
  /** Al editar una solicitada. */
  editing?: { id: string; folio: number; warehouseId: string; note: string | null; lines: DraftLine[] };
  initial?: DraftLine[];
  initialNotice?: string;
}

export function RequisitionBuilder({ warehouses, levels, products, suppliers, calculations, templates, owner, editing, initial, initialNotice }: BuilderProps) {
  const router = useRouter();
  const [warehouseId, setWarehouseId] = useState(editing?.warehouseId ?? warehouses[0]?.id ?? "");
  const [rows, setRows] = useState<Row[]>(() => (editing ? editing.lines.map(fromDraft) : initial?.length ? initial.map(fromDraft) : [blank()]));
  const [source, setSource] = useState<"minimums" | "calculation" | "template">("minimums");
  const [sourceId, setSourceId] = useState("");
  const [notice, setNotice] = useState<string | null>(initialNotice ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState<null | { name: string; exists: boolean }>(null);
  const byId = new Map(products.map((p) => [p.id, p]));
  const supplierName = new Map(suppliers.map((x) => [x.id, x.name]));
  const productOptions = products.map((p) => ({ value: p.id, label: p.name, hint: p.supplierId ? supplierName.get(p.supplierId) : undefined }));
  const set = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const body = () => rows.filter((r) => r.productId).map((r) => ({ productId: r.productId, quantity: r.quantity.trim(), presentationId: r.presentationId || null, supplierId: r.supplierId || null }));

  async function addFrom() {
    setError(null);
    const result = await api<{ lines: DraftLine[]; skipped: string[]; withoutMax: number }>("/api/requisitions/suggest", { body: { warehouseId, source, id: source === "minimums" ? null : sourceId } });
    if (!result.ok) return setError(result.error.message);
    const added = result.data.lines.map(fromDraft);
    setRows((rs) => [...rs.filter((r) => r.productId), ...added]);
    setNotice([t.added(added.length), result.data.skipped.length ? t.skipped(result.data.skipped.join(", ")) : "", result.data.withoutMax ? t.withoutMax(result.data.withoutMax) : ""].filter(Boolean).join(" "));
  }

  async function submit(form: HTMLFormElement) {
    const note = String(new FormData(form).get("note") ?? "");
    setBusy(true);
    setError(null);
    const result = editing
      ? await api<{ requisition: { id: string } }>(`/api/requisitions/${editing.id}`, { method: "PUT", body: { lines: body(), note } })
      : await api<{ requisition: { id: string } }>("/api/requisitions", { body: { warehouseId, lines: body(), note } });
    setBusy(false);
    if (!result.ok) return setError(result.error.message);
    router.push(`/requisiciones/${result.data.requisition.id}`);
  }

  async function saveTemplate(replace: boolean) {
    if (!saving) return;
    const result = await api("/api/purchase-templates", { body: { name: saving.name, lines: body(), replace } });
    if (!result.ok) {
      if (result.error.code === "template_exists") return setSaving({ ...saving, exists: true });
      setSaving(null);
      return setError(result.error.message);
    }
    setSaving(null);
    setNotice(t.templateSaved);
  }

  return (
    <>
      <PageHeader title={editing ? t.editTitle(editing.folio) : t.newTitle} subtitle={t.newIntro} />
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget);
        }}
      >
        {error ? <Alert tone="error">{error}</Alert> : null}
        {notice ? <Alert tone="info">{notice}</Alert> : null}
        <SelectField label={t.warehouse} className="lg:max-w-md" value={warehouseId} disabled={!!editing} onChange={(e) => setWarehouseId(e.target.value)} options={warehouses.map((w) => ({ value: w.id, label: warehouseLabel(w) }))} />
        <section aria-label={t.addFrom} className="flex flex-col gap-3">
          <SectionLabel as="h2">{t.addFrom}</SectionLabel>
          <div className="grid gap-3 lg:grid-cols-3 lg:items-end">
            <SelectField
              label={t.addFrom}
              hideLabel
              value={source}
              onChange={(e) => {
                setSource(e.target.value as typeof source);
                setSourceId("");
              }}
              options={[
                { value: "minimums", label: t.fromMinimums },
                { value: "calculation", label: t.fromCalculation },
                { value: "template", label: t.fromTemplate },
              ]}
            />
            {source === "calculation" ? (
              <SelectField label={t.fromCalculation} hideLabel value={sourceId} onChange={(e) => setSourceId(e.target.value)} options={[{ value: "", label: t.chooseCalculation }, ...calculations.map((c) => ({ value: c.id, label: c.label }))]} />
            ) : source === "template" ? (
              <SelectField label={t.fromTemplate} hideLabel value={sourceId} onChange={(e) => setSourceId(e.target.value)} options={[{ value: "", label: t.chooseTemplate }, ...templates.map((x) => ({ value: x.id, label: x.name }))]} />
            ) : (
              <span className="hidden lg:block" />
            )}
            <Button variant="secondary" disabled={!warehouseId || (source !== "minimums" && !sourceId)} onAction={addFrom}>
              {t.add}
            </Button>
          </div>
        </section>
        <section aria-label={t.lines} className="flex flex-col gap-3">
          <SectionLabel as="h2">{t.lines}</SectionLabel>
          <p className="text-sm text-ink-muted">{t.repeatedHint}</p>
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
                  const level = product ? levels[warehouseId]?.[product.id]?.[row.presentationId] : undefined;
                  const unit = product ? (product.presentations.find((x) => (x.id ?? "") === row.presentationId)?.name ?? unitShort(product.baseUnit)) : "";
                  return (
                    <li key={row.key} className="border-b border-line py-3">
                      <fieldset className="grid grid-cols-6 gap-x-3 gap-y-2 lg:grid-cols-12 lg:items-start">
                        <legend className="sr-only">{t.lineN(index + 1)}</legend>
                        <ComboField
                          label={t.product}
                          placeholder={t.searchProduct}
                          className="col-span-6 lg:col-span-3"
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
                        <SelectField label={t.supplier} className="col-span-5 lg:col-span-3" value={row.supplierId} onChange={(e) => set(row.key, { supplierId: e.target.value })} options={[{ value: "", label: t.noSupplier }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
                        <div className="col-span-1 flex items-end justify-end lg:pt-7">
                          <Button variant="ghost" aria-label={t.removeLine(product?.name ?? "")} onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}>
                            <Icon name="trash" size={18} />
                          </Button>
                        </div>
                        {product ? (
                          <p className="col-span-6 text-sm text-ink-muted tabular-nums lg:col-span-12" data-testid="builder-level">
                            {t.levelLine(formatQuantity(level?.stock ?? "0"), level?.min ? formatQuantity(level.min) : null, level?.max ? formatQuantity(level.max) : null, unit)}
                          </p>
                        ) : null}
                      </fieldset>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          <button type="button" onClick={() => setRows((rs) => [...rs, blank()])} className="inline-flex min-h-12 items-center gap-2 self-start font-semibold text-primary">
            <Icon name="plus" size={18} />
            {t.addLine}
          </button>
        </section>
        <TextArea label={t.note} name="note" rows={2} maxLength={200} hint={t.noteHint} defaultValue={editing?.note ?? ""} />
        <div className="sticky bottom-(--nav-space) -mx-4 flex flex-wrap justify-end gap-2 border-t border-line bg-surface px-4 py-3 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0">
          <Button variant="secondary" onClick={() => setSaving({ name: "", exists: false })}>
            {t.saveTemplate}
          </Button>
          <Button type="submit" loading={busy}>
            {editing ? t.saveChanges : owner ? t.sendOwner : t.send}
          </Button>
        </div>
      </form>
      <Dialog open={saving !== null} title={t.saveTemplate} onClose={() => setSaving(null)}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void saveTemplate(saving?.exists ?? false);
          }}
        >
          <TextField label={t.templateName} required maxLength={80} value={saving?.name ?? ""} onChange={(e) => setSaving((s) => (s ? { name: e.target.value, exists: false } : s))} />
          {saving?.exists ? <Alert tone="warning">{t.templateExists}</Alert> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSaving(null)}>
              {t.cancel}
            </Button>
            <Button type="submit">{saving?.exists ? t.replace : t.save}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

/** RF-31: los renglones con producto, agrupados por proveedor en orden de nombre, con «Sin proveedor» al final; los
 * renglones aún vacíos van al final, sin título. Solo agrupa lo que ya está en pantalla. */
function groupsOf(rows: Row[], supplierName: Map<string, string>) {
  const groups = new Map<string, { key: string; label: string | null; rows: { row: Row; index: number }[] }>();
  rows.forEach((row, index) => {
    const key = !row.productId ? "blank" : row.supplierId && supplierName.has(row.supplierId) ? row.supplierId : "none";
    if (!groups.has(key)) groups.set(key, { key, label: key === "blank" ? null : key === "none" ? t.noSupplier : supplierName.get(key)!, rows: [] });
    groups.get(key)!.rows.push({ row, index });
  });
  const rank = (k: string) => (k === "blank" ? 2 : k === "none" ? 1 : 0);
  return [...groups.values()].sort((a, b) => rank(a.key) - rank(b.key) || (a.label ?? "").localeCompare(b.label ?? "", "es"));
}
