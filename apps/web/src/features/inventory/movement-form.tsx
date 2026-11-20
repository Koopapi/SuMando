"use client";

// Spec 005 RF-11 a RF-19: entrada, salida o ajuste en un almacén. El servidor valida y calcula la existencia.
// Spec 015 RF-25, RF-27: la entrada y la salida cargan lo capturado en su asistente y ofrecen «Paso a paso».
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { ProductOption, WarehouseOption } from "@/server/services/inventory/views";
import { Alert, Button, PageHeader, SelectField, TextArea, TextField } from "@/ui";
import { api } from "../api";
import { discardWizardDraft, toWizard, useWizardDraftFor } from "../wizards/view-switch";
import { FULL_PATH, WIZARD_KIND, type MovementDraft } from "./wizards/movement-wizard";
import { warehouseLabel } from "./labels";
import { blankLine, LinesEditor, linesBody, type LineDraft } from "./lines-editor";

const t = es.inventory;
type Kind = "entry" | "exit" | "adjustment";

const HEAD: Record<Kind, [string, string]> = { entry: [t.entryTitle, t.entryIntro], exit: [t.exitTitle, t.exitIntro], adjustment: [t.adjustmentTitle, t.adjustmentIntro] };

export function MovementForm({ kind, warehouses, products, suppliers = [], initialWarehouseId }: { kind: Kind; warehouses: WarehouseOption[]; products: ProductOption[]; suppliers?: { id: string; name: string }[]; initialWarehouseId?: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<LineDraft[]>(() => [blankLine()]);
  const [warehouseId, setWarehouseId] = useState(initialWarehouseId ?? warehouses[0]?.id ?? "");
  const [reason, setReason] = useState("waste");
  const [supplierId, setSupplierId] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  // Lo que se confirmó como fuera de lo normal en el asistente se conserva para cuando vuelva a él.
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const wizard = kind === "adjustment" ? null : kind;

  useWizardDraftFor<MovementDraft>(wizard ? WIZARD_KIND[wizard] : null, (d) => {
    if (d.warehouseId && warehouses.some((w) => w.id === d.warehouseId)) setWarehouseId(d.warehouseId);
    setSupplierId(d.supplierId ?? "");
    setReference(d.reference ?? "");
    setReason(d.reason || "waste");
    setNote(d.note ?? "");
    if (d.rows?.length) setRows(d.rows);
    setConfirmed(d.confirmed ?? []);
  });

  async function stepByStep() {
    if (!wizard) return;
    const data: MovementDraft = { warehouseId, supplierId, reference, reason, to: "", note, rows, confirmed };
    router.push(await toWizard(WIZARD_KIND[wizard], "products", data, FULL_PATH[wizard]));
  }

  async function submit() {
    const body = {
      kind,
      warehouseId,
      lines: linesBody(rows),
      ...(kind === "entry" ? { supplierId: supplierId || null, reference, note } : {}),
      ...(kind === "exit" ? { reason, note } : {}),
      ...(kind === "adjustment" ? { note } : {}),
    };
    setBusy(true);
    setError(null);
    const result = await api<{ movement: { id: string } }>("/api/inventory/movements", { body });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    if (wizard) await discardWizardDraft(WIZARD_KIND[wizard]);
    router.push(`/inventario/movimientos/${result.data.movement.id}`);
  }

  const [title, intro] = HEAD[kind];
  return (
    <>
      <PageHeader title={title} subtitle={intro} />
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {error ? <Alert tone="error">{error}</Alert> : null}
        <div className="grid gap-4 lg:grid-cols-3">
          <SelectField label={t.warehouse} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} options={warehouses.map((w) => ({ value: w.id, label: warehouseLabel(w) }))} />
          {kind === "entry" ? (
            <>
              <SelectField label={t.supplier} value={supplierId} onChange={(e) => setSupplierId(e.target.value)} options={[{ value: "", label: t.noSupplier }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
              <TextField label={t.reference} maxLength={40} hint={t.referenceHint} value={reference} onChange={(e) => setReference(e.target.value)} />
            </>
          ) : null}
          {kind === "exit" ? <SelectField label={t.reason} value={reason} onChange={(e) => setReason(e.target.value)} options={Object.entries(t.reasons).map(([value, label]) => ({ value, label }))} /> : null}
        </div>
        <LinesEditor rows={rows} onChange={setRows} products={products} single={kind === "adjustment"} signed={kind === "adjustment"} />
        {kind === "adjustment" ? (
          <TextArea label={t.adjustmentReason} rows={2} maxLength={200} hint={t.adjustmentReasonHint} required value={note} onChange={(e) => setNote(e.target.value)} />
        ) : (
          <TextArea label={kind === "exit" && reason === "other" ? t.noteRequired : t.note} rows={2} maxLength={200} hint={t.noteHint} required={kind === "exit" && reason === "other"} value={note} onChange={(e) => setNote(e.target.value)} />
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {wizard ? (
            <Button variant="ghost" onAction={stepByStep}>
              {es.common.stepByStep}
            </Button>
          ) : null}
          <Button type="submit" loading={busy}>
            {t.save}
          </Button>
        </div>
      </form>
    </>
  );
}
