"use client";

// Spec 007 RF-7 a RF-24: armar una requisición desde los mínimos, un cálculo, una plantilla o a mano, y enviarla (o
// guardar los cambios si se edita). Sugerencias, sumas y reglas las decide el servidor.
// Spec 013 RF-29 a RF-32: el producto se busca escribiendo, cada renglón muestra existencia, mínimo y máximo, y los
// renglones se ven agrupados por proveedor.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { es } from "@/i18n";
import type { WarehouseOption } from "@/server/services/inventory/views";
import type { BuilderLevels } from "@/server/services/requisitions/requisitions";
import type { DraftLine } from "@/server/services/requisitions/views";
import { Alert, Button, Dialog, Icon, PageHeader, SectionLabel, SelectField, TextArea, TextField } from "@/ui";
import { api } from "../api";
import { RequisitionLines, blank, fromDraft, lineBody, restoreRows, type BuilderProduct, type Row } from "./requisition-lines";
import { draftPath } from "../wizards/use-wizard-draft";
import { switchView, viewHref } from "../wizards/view-switch";
import type { NewRequisitionDraft } from "./wizards/new-requisition";
import { warehouseLabel } from "../inventory/labels";

const t = es.requisitions;


export interface BuilderProps {
  warehouses: WarehouseOption[];
  /** Spec 013, RF-30: existencia, mínimo y máximo por almacén, producto y presentación. */
  levels: BuilderLevels;
  products: BuilderProduct[];
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
  // Spec 014, RF-21: un solo renglón abierto; al empezar vacía, el primero.
  const [openKey, setOpenKey] = useState<number | null>(() => (rows.length === 1 && !rows[0].productId ? rows[0].key : null));
  const [source, setSource] = useState<"minimums" | "calculation" | "template">("minimums");
  const [sourceId, setSourceId] = useState("");
  const [notice, setNotice] = useState<string | null>(initialNotice ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState<null | { name: string; exists: boolean }>(null);
  const [note, setNote] = useState(editing?.note ?? "");
  const [draft, setDraft] = useState<NewRequisitionDraft | null>(null);

  // Spec 015, RF-27: lo capturado a medias (en el asistente o aquí) llega por su borrador, salvo al editar o al
  // empezar con una plantilla.
  useEffect(() => {
    if (editing || initial?.length) return;
    void api<{ draft: { data: NewRequisitionDraft } | null }>(draftPath("req-new")).then((r) => {
      const d = r.ok ? r.data.draft?.data : null;
      if (!d) return;
      setDraft(d);
      setWarehouseId(d.warehouseId);
      setRows(d.rows.length ? restoreRows(d.rows) : [blank()]);
      setOpenKey(null);
      if (d.source !== "manual") setSource(d.source);
      setSourceId(d.sourceId);
      setNote(d.note);
    });
  }, [editing, initial]);

  async function stepByStep() {
    const data: NewRequisitionDraft = { warehouseId, source, sourceId, added: draft?.added ?? null, rows: rows.filter((r) => r.productId), note, confirmed: draft?.confirmed ?? [] };
    await switchView("req-new", "wizard", async () => {
      await api(draftPath("req-new"), { method: "PUT", body: { step: "products", data } });
    });
    router.push(viewHref("/requisiciones/nueva", "wizard"));
  }
  const body = () => lineBody(rows);

  async function addFrom() {
    setError(null);
    const result = await api<{ lines: DraftLine[]; skipped: string[]; withoutMax: number }>("/api/requisitions/suggest", { body: { warehouseId, source, id: source === "minimums" ? null : sourceId } });
    if (!result.ok) return setError(result.error.message);
    const added = result.data.lines.map(fromDraft);
    setRows((rs) => [...rs.filter((r) => r.productId), ...added]);
    setNotice([t.added(added.length), result.data.skipped.length ? t.skipped(result.data.skipped.join(", ")) : "", result.data.withoutMax ? t.withoutMax(result.data.withoutMax) : ""].filter(Boolean).join(" "));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const result = editing
      ? await api<{ requisition: { id: string } }>(`/api/requisitions/${editing.id}`, { method: "PUT", body: { lines: body(), note } })
      : await api<{ requisition: { id: string } }>("/api/requisitions", { body: { warehouseId, lines: body(), note } });
    setBusy(false);
    if (!result.ok) return setError(result.error.message);
    if (!editing) await api(draftPath("req-new"), { method: "DELETE" });
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
          void submit();
        }}
      >
        {error ? <Alert tone="error">{error}</Alert> : null}
        {notice ? <Alert tone="info">{notice}</Alert> : null}
        <SelectField label={t.warehouse} className="lg:max-w-md" value={warehouseId} disabled={!!editing} onChange={(e) => setWarehouseId(e.target.value)} options={warehouses.map((w) => ({ value: w.id, label: warehouseLabel(w) }))} />
        <section aria-label={t.addFrom} className="flex flex-col gap-2">
          <SectionLabel as="h2">{t.addFrom}</SectionLabel>
          <div className="flex flex-wrap items-end gap-2">
            <SelectField
              label={t.addFrom}
              hideLabel
              className="min-w-0 flex-1 lg:max-w-xs"
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
              <SelectField label={t.fromCalculation} hideLabel className="order-last w-full lg:order-none lg:w-72" value={sourceId} onChange={(e) => setSourceId(e.target.value)} options={[{ value: "", label: t.chooseCalculation }, ...calculations.map((c) => ({ value: c.id, label: c.label }))]} />
            ) : source === "template" ? (
              <SelectField label={t.fromTemplate} hideLabel className="order-last w-full lg:order-none lg:w-72" value={sourceId} onChange={(e) => setSourceId(e.target.value)} options={[{ value: "", label: t.chooseTemplate }, ...templates.map((x) => ({ value: x.id, label: x.name }))]} />
            ) : null}
            <Button variant="secondary" disabled={!warehouseId || (source !== "minimums" && !sourceId)} onAction={addFrom}>
              {t.add}
            </Button>
          </div>
        </section>
        <section aria-label={t.lines} className="flex flex-col gap-3">
          <SectionLabel as="h2">{t.lines}</SectionLabel>
          <p className="text-sm text-ink-muted">{t.repeatedHint}</p>
          <RequisitionLines rows={rows} setRows={setRows} warehouseId={warehouseId} levels={levels} products={products} suppliers={suppliers} openKey={openKey} setOpenKey={setOpenKey} />
          <button
            type="button"
            onClick={() => {
              const row = blank();
              setRows((rs) => [...rs, row]);
              setOpenKey(row.key);
            }}
            className="inline-flex min-h-12 items-center gap-2 self-start font-semibold text-primary">
            <Icon name="plus" size={18} />
            {t.addLine}
          </button>
        </section>
        <TextArea label={t.note} name="note" rows={2} maxLength={200} hint={t.noteHint} value={note} onChange={(e) => setNote(e.target.value)} />
        {editing ? null : (
          <Button variant="ghost" className="self-start" onAction={stepByStep}>
            {es.common.stepByStep}
          </Button>
        )}
        <div className="sticky bottom-(--nav-space) -mx-4 flex justify-end gap-2 border-t border-line bg-surface px-4 py-2 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 [&>*]:flex-1 lg:[&>*]:flex-none">
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
