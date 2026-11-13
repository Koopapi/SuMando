"use client";

// Spec 005 RF-22 a RF-27, RF-38: traspaso a otro almacén del negocio o a otro negocio (solo se ve el nombre del
// destino). El servidor decide si entra al momento o queda en camino.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { DestinationView, ProductOption, WarehouseOption } from "@/server/services/inventory/views";
import { Alert, Button, PageHeader, SelectField, TextArea } from "@/ui";
import { api } from "../api";
import { warehouseLabel } from "./labels";
import { blankLine, LinesEditor, linesBody, type LineDraft } from "./lines-editor";

const t = es.inventory;

export function TransferForm({ warehouses, destinations, products, initialWarehouseId }: { warehouses: WarehouseOption[]; destinations: DestinationView[]; products: ProductOption[]; initialWarehouseId?: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<LineDraft[]>(() => [blankLine()]);
  const [from, setFrom] = useState(initialWarehouseId ?? warehouses[0]?.id ?? "");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const options = destinations.flatMap((b) => b.warehouses.filter((w) => w.id !== from).map((w) => ({ value: w.id, label: t.destinationOption(b.name, w.name) })));

  async function submit(form: HTMLFormElement) {
    setBusy(true);
    setError(null);
    const result = await api<{ transfer: { id: string } }>("/api/inventory/transfers", { body: { fromWarehouseId: from, toWarehouseId: to, lines: linesBody(rows), note: String(new FormData(form).get("note") ?? "") } });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.push(`/inventario/traspasos/${result.data.transfer.id}`);
  }

  return (
    <>
      <PageHeader title={t.transferTitle} subtitle={t.transferIntro} />
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget);
        }}
      >
        {error ? <Alert tone="error">{error}</Alert> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          <SelectField label={t.from} value={from} onChange={(e) => setFrom(e.target.value)} options={warehouses.map((w) => ({ value: w.id, label: warehouseLabel(w) }))} />
          <SelectField label={t.to} value={to} onChange={(e) => setTo(e.target.value)} options={[{ value: "", label: t.chooseDestination }, ...options]} />
        </div>
        <LinesEditor rows={rows} onChange={setRows} products={products} />
        <TextArea label={t.note} name="note" rows={2} maxLength={200} hint={t.noteHint} />
        <div className="flex justify-end">
          <Button type="submit" loading={busy}>
            {t.transfer}
          </Button>
        </div>
      </form>
    </>
  );
}
