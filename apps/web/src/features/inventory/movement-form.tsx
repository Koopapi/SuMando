"use client";

// Spec 005 RF-11 a RF-19: entrada, salida o ajuste en un almacén. El servidor valida y calcula la existencia.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { ProductOption, WarehouseOption } from "@/server/services/inventory/views";
import { Alert, Button, PageHeader, SelectField, TextArea, TextField } from "@/ui";
import { api } from "../api";
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const text = (k: string) => String(data.get(k) ?? "");
    const body = {
      kind,
      warehouseId,
      lines: linesBody(rows),
      ...(kind === "entry" ? { supplierId: text("supplierId") || null, reference: text("reference"), note: text("note") } : {}),
      ...(kind === "exit" ? { reason, note: text("note") } : {}),
      ...(kind === "adjustment" ? { note: text("note") } : {}),
    };
    setBusy(true);
    setError(null);
    const result = await api<{ movement: { id: string } }>("/api/inventory/movements", { body });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
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
          void submit(e.currentTarget);
        }}
      >
        {error ? <Alert tone="error">{error}</Alert> : null}
        <div className="grid gap-4 lg:grid-cols-3">
          <SelectField label={t.warehouse} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} options={warehouses.map((w) => ({ value: w.id, label: warehouseLabel(w) }))} />
          {kind === "entry" ? (
            <>
              <SelectField label={t.supplier} name="supplierId" defaultValue="" options={[{ value: "", label: t.noSupplier }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
              <TextField label={t.reference} name="reference" maxLength={40} hint={t.referenceHint} />
            </>
          ) : null}
          {kind === "exit" ? <SelectField label={t.reason} value={reason} onChange={(e) => setReason(e.target.value)} options={Object.entries(t.reasons).map(([value, label]) => ({ value, label }))} /> : null}
        </div>
        <LinesEditor rows={rows} onChange={setRows} products={products} single={kind === "adjustment"} signed={kind === "adjustment"} />
        {kind === "adjustment" ? (
          <TextArea label={t.adjustmentReason} name="note" rows={2} maxLength={200} hint={t.adjustmentReasonHint} required />
        ) : (
          <TextArea label={kind === "exit" && reason === "other" ? t.noteRequired : t.note} name="note" rows={2} maxLength={200} hint={t.noteHint} required={kind === "exit" && reason === "other"} />
        )}
        <div className="flex justify-end">
          <Button type="submit" loading={busy}>
            {t.save}
          </Button>
        </div>
      </form>
    </>
  );
}
