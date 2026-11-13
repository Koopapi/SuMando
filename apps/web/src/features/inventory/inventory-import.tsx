"use client";

// Spec 006 RF-3, RF-16, RF-17, RF-22, RF-36: elegir almacén, subir la hoja, revisar producto por producto y
// confirmar. El archivo se manda dos veces porque el servidor no guarda nada entre pasos (plan, sección 3).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { ImportRowView, ImportSummary } from "@/server/services/inventory/import";
import type { WarehouseOption } from "@/server/services/inventory/views";
import { Alert, Button, DataTable, FileField, LinkButton, PageHeader, SectionLabel, SelectField, StatusBadge, formatQuantity, type Column, type Filter } from "@/ui";
import { unitShort } from "../catalog/labels";
import { warehouseLabel } from "./labels";

const t = es.inventory.importer;
const TONE = { new: "success", existing: "neutral", problem: "danger" } as const;

async function send(file: File, warehouseId: string, confirm: boolean) {
  const form = new FormData();
  form.set("file", file);
  form.set("warehouseId", warehouseId);
  if (confirm) form.set("confirm", "1");
  try {
    const res = await fetch("/api/inventory/import", { method: "POST", body: form });
    const data = await res.json().catch(() => null);
    return res.ok ? { ok: true as const, data } : { ok: false as const, message: (data?.error?.message as string) ?? es.common.unknownError };
  } catch {
    return { ok: false as const, message: es.common.unknownError };
  }
}

function Detail({ r }: { r: ImportRowView }) {
  const unit = unitShort(r.baseUnit);
  const lines = [
    r.count ? t.countAs(r.count.name, formatQuantity(r.count.factor), unit) : null,
    r.purchase ? t.buyAs(r.purchase.name, formatQuantity(r.purchase.factor), unit) : null,
    r.quantity !== null ? t.quantity(formatQuantity(r.quantity), unit) : t.noQuantity,
    r.min !== null ? t.min(formatQuantity(r.min), unit) : null,
    r.supplier ? t.supplier(r.supplier) : null,
  ].filter((x): x is string => x !== null);
  return (
    <span className="flex flex-col gap-0.5 text-sm">
      {lines.map((l) => (
        <span key={l}>{l}</span>
      ))}
      {r.problems.map((p) => (
        <span key={p} className="font-semibold text-danger">
          {t.problems[p]}
        </span>
      ))}
      {r.warnings.map((w) => (
        <span key={w} className="text-warning">
          {t.warnings[w]}
        </span>
      ))}
      <span className="text-ink-muted">{t.where(r.sheet, r.row)}</span>
    </span>
  );
}

export function InventoryImport({ warehouses }: { warehouses: WarehouseOption[] }) {
  const router = useRouter();
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [review, setReview] = useState<{ summary: ImportSummary; rows: ImportRowView[] } | null>(null);
  const [done, setDone] = useState<{ created: number; completed: number; skipped: number; areasCounted: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  async function run(confirm: boolean) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const r = await send(file, warehouseId, confirm);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    if (confirm) {
      setDone(r.data);
      setReview(null);
      setFile(null);
      setInputKey((k) => k + 1);
      router.refresh();
    } else {
      setDone(null);
      setReview(r.data);
    }
  }

  const columns: Column<ImportRowView>[] = [
    { key: "name", header: t.product, phone: "title", cell: (r) => <span className="font-semibold">{r.name}</span> },
    { key: "status", header: t.status, phone: "badge", cell: (r) => <StatusBadge tone={TONE[r.status]}>{t.statuses[r.status]}</StatusBadge> },
    { key: "area", header: t.area, phone: "primary", cell: (r) => r.area },
    { key: "detail", header: t.detail, phone: "detail", cell: (r) => <Detail r={r} /> },
  ];
  const filters: Filter<ImportRowView>[] = [
    { id: "new", label: t.filterNew, test: (r) => r.status === "new" },
    { id: "existing", label: t.filterExisting, test: (r) => r.status === "existing" },
    { id: "problem", label: t.filterProblem, test: (r) => r.status === "problem" },
    { id: "warning", label: t.filterWarning, test: (r) => r.warnings.length > 0 },
  ];
  const importable = review ? review.summary.newProducts + review.summary.existingProducts : 0;
  const s = review?.summary;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.title} subtitle={t.intro} />
      {done ? (
        <Alert tone="success" title={t.done}>
          <span className="flex flex-col gap-3">
            {t.doneDetail(done.created, done.completed, done.skipped, done.areasCounted)}
            <span className="flex flex-wrap gap-2">
              <LinkButton href={`/inventario?almacen=${warehouseId}`}>{t.seeStock}</LinkButton>
              <LinkButton href="/inventario/conteo" variant="secondary">
                {t.seeCount}
              </LinkButton>
            </span>
          </span>
        </Alert>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <SelectField label={t.warehouse} value={warehouseId} onChange={(e) => (setWarehouseId(e.target.value), setReview(null))} options={warehouses.map((w) => ({ value: w.id, label: warehouseLabel(w) }))} />
        <FileField
          key={inputKey}
          label={t.file}
          hint={t.fileHint}
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setReview(null);
          }}
        />
      </div>
      {!review ? (
        <div>
          <Button loading={busy} disabled={!file || !warehouseId} onClick={() => void run(false)}>
            {t.review}
          </Button>
        </div>
      ) : null}
      {review && s ? (
        <>
          <section aria-label={t.summaryLabel} className="flex flex-col gap-2">
            <SectionLabel as="h2">{t.summaryLabel}</SectionLabel>
            <ul className="flex flex-wrap gap-2" data-testid="import-summary">
              {[t.summary.newProducts(s.newProducts), t.summary.existingProducts(s.existingProducts), t.summary.problems(s.problems), t.summary.newSuppliers(s.newSuppliers), t.summary.newAreas(s.newAreas), t.summary.areasCounted(s.areasCounted)].map((x) => (
                <li key={x} className="rounded-md border border-line-strong px-2.5 py-1 text-sm">
                  {x}
                </li>
              ))}
            </ul>
          </section>
          <DataTable caption={t.caption} rows={review.rows} columns={columns} rowKey={(r) => `${r.sheet}:${r.row}`} rowName={(r) => r.name} searchFields={(r) => [r.name, r.area]} searchLabel={t.search} filters={filters} />
          <div className="sticky bottom-(--nav-space) -mx-4 flex flex-wrap justify-end gap-2 border-t border-line bg-surface px-4 py-3 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0">
            <Button variant="secondary" onClick={() => (setReview(null), setFile(null), setInputKey((k) => k + 1))}>
              {t.again}
            </Button>
            <Button loading={busy} disabled={importable === 0} onClick={() => void run(true)}>
              {t.confirm(importable)}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
