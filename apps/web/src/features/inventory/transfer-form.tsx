"use client";

// Spec 005 RF-22 a RF-27, RF-38: traspaso a otro almacén del negocio o a otro negocio (solo se ve el nombre del
// destino). El servidor decide si entra al momento o queda en camino.
// Spec 015 RF-25, RF-27: carga lo capturado en el asistente «Traspaso» y ofrece «Paso a paso».
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { DestinationView, ProductOption, WarehouseOption } from "@/server/services/inventory/views";
import { Alert, Button, PageHeader, SelectField, TextArea } from "@/ui";
import { api } from "../api";
import { discardWizardDraft, toWizard, useWizardDraftFor } from "../wizards/view-switch";
import type { MovementDraft } from "./wizards/movement-wizard";
import { warehouseLabel } from "./labels";
import { blankLine, LinesEditor, linesBody, type LineDraft } from "./lines-editor";

const t = es.inventory;

export function TransferForm({ warehouses, destinations, products, initialWarehouseId }: { warehouses: WarehouseOption[]; destinations: DestinationView[]; products: ProductOption[]; initialWarehouseId?: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<LineDraft[]>(() => [blankLine()]);
  const [from, setFrom] = useState(initialWarehouseId ?? warehouses[0]?.id ?? "");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const options = destinations.flatMap((b) => b.warehouses.filter((w) => w.id !== from).map((w) => ({ value: w.id, label: t.destinationOption(b.name, w.name) })));

  useWizardDraftFor<MovementDraft>("inv-transfer", (d) => {
    if (d.warehouseId && warehouses.some((w) => w.id === d.warehouseId)) setFrom(d.warehouseId);
    setTo(d.to ?? "");
    setNote(d.note ?? "");
    if (d.rows?.length) setRows(d.rows);
  });

  async function stepByStep() {
    const data: MovementDraft = { warehouseId: from, supplierId: "", reference: "", reason: "waste", to, note, rows, confirmed: [] };
    router.push(await toWizard("inv-transfer", "products", data, "/inventario/traspaso"));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const result = await api<{ transfer: { id: string } }>("/api/inventory/transfers", { body: { fromWarehouseId: from, toWarehouseId: to, lines: linesBody(rows), note } });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await discardWizardDraft("inv-transfer");
    router.push(`/inventario/traspasos/${result.data.transfer.id}`);
  }

  return (
    <>
      <PageHeader title={t.transferTitle} subtitle={t.transferIntro} />
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {error ? <Alert tone="error">{error}</Alert> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          <SelectField label={t.from} value={from} onChange={(e) => setFrom(e.target.value)} options={warehouses.map((w) => ({ value: w.id, label: warehouseLabel(w) }))} />
          <SelectField label={t.to} value={to} onChange={(e) => setTo(e.target.value)} options={[{ value: "", label: t.chooseDestination }, ...options]} />
        </div>
        <LinesEditor rows={rows} onChange={setRows} products={products} />
        <TextArea label={t.note} rows={2} maxLength={200} hint={t.noteHint} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onAction={stepByStep}>
            {es.common.stepByStep}
          </Button>
          <Button type="submit" loading={busy}>
            {t.transfer}
          </Button>
        </div>
      </form>
    </>
  );
}
