"use client";

// Asistente «Nueva requisición» (spec 015, RF-28 y RF-29): Almacén, De dónde agregar, Productos y cantidades, Nota y
// Resumen. Usa las mismas rutas que la pantalla completa: sugerir (`/api/requisitions/suggest`) y enviar
// (`/api/requisitions`); nada se registra hasta confirmar el resumen (RF-8).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseMilli } from "@/domain/catalog/units";
import { nextAfter } from "@/domain/wizards/next";
import { unusual } from "@/domain/wizards/unusual";
import { es } from "@/i18n";
import type { WizardExamples } from "@/server/services/wizards/examples";
import { Alert, Button, Icon, LinkButton, LoadingState, ResumePrompt, SelectField, TextArea, UnusualMark, UnusualNotice, Wizard, formatQuantity } from "@/ui";
import { api } from "../../api";
import { warehouseLabel } from "../../inventory/labels";
import { useWizardDraft } from "../../wizards/use-wizard-draft";
import { switchView, viewHref } from "../../wizards/view-switch";
import type { BuilderProps } from "../requisition-builder";
import { RequisitionLines, blank, fromDraft, groupsOf, levelOf, lineBody, restoreRows, unitOf, type Row } from "../requisition-lines";

const t = es.requisitions;
const w = t.wizard;

export type Source = "minimums" | "calculation" | "template" | "manual";

/** Lo que comparten el asistente y la pantalla completa (RF-27). */
export interface NewRequisitionDraft {
  warehouseId: string;
  source: Source;
  sourceId: string;
  /** De qué fuente ya se agregaron productos, para no repetirlos al ir y volver. */
  added: string | null;
  rows: Row[];
  note: string;
  /** Datos raros confirmados: producto, presentación y cantidad. */
  confirmed: string[];
}

export const STEPS = ["warehouse", "source", "products", "note"] as const;
const unusualKey = (r: Row) => `${r.productId}|${r.presentationId}|${r.quantity.trim()}`;

export function NewRequisitionWizard({ warehouses, levels, products, suppliers, calculations, templates, owner, examples, autoResume }: Omit<BuilderProps, "editing" | "initial" | "initialNotice"> & { examples: WizardExamples; autoResume: boolean }) {
  const router = useRouter();
  const initial: NewRequisitionDraft = { warehouseId: warehouses[0]?.id ?? "", source: "minimums", sourceId: "", added: null, rows: [], note: "", confirmed: [] };
  const draft = useWizardDraft({ kind: "req-new", initial, steps: [...STEPS], autoResume });
  const d = draft.data;
  const [openKey, setOpenKey] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { id: string; folio: number }>(null);
  const byId = new Map(products.map((p) => [p.id, p]));
  const supplierName = new Map(suppliers.map((x) => [x.id, x.name]));
  const set = (patch: Partial<NewRequisitionDraft>) => draft.update((x) => ({ ...x, ...patch }));
  const setRows = (fn: (rows: Row[]) => Row[]) => draft.update((x) => ({ ...x, rows: fn(x.rows) }));
  const go = (i: number) => {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  };

  const sourceKey = `${d.warehouseId}|${d.source}|${d.sourceId}`;
  const filled = d.rows.filter((r) => r.productId);
  // RF-13: pedir más del doble del máximo de ese almacén, en la misma presentación.
  const oddOf = (r: Row) => {
    const lvl = levelOf(levels, d.warehouseId, r);
    return r.productId && r.quantity.trim() ? unusual("order", r.quantity, lvl?.max ?? null) : { unusual: false, expected: null };
  };
  const pending = filled.filter((r) => oddOf(r).unusual && !d.confirmed.includes(unusualKey(r)));

  async function addFromSource() {
    setStepError(null);
    if (d.source === "manual") {
      if (!d.rows.length) {
        const row = blank();
        setRows(() => [row]);
        setOpenKey(row.key);
      }
      return true;
    }
    if (d.source !== "minimums" && !d.sourceId) {
      setStepError(w.chooseSource);
      return false;
    }
    if (d.added === sourceKey) return true;
    const result = await api<{ lines: { productId: string; quantity: string; presentationId: string | null; supplierId: string | null }[]; skipped: string[]; withoutMax: number }>("/api/requisitions/suggest", {
      body: { warehouseId: d.warehouseId, source: d.source, id: d.source === "minimums" ? null : d.sourceId },
    });
    if (!result.ok) {
      setStepError(result.error.message);
      return false;
    }
    const added = result.data.lines.map(fromDraft);
    draft.update((x) => ({ ...x, added: sourceKey, rows: [...x.rows.filter((r) => r.productId), ...added] }));
    setNotice([t.added(added.length), result.data.skipped.length ? t.skipped(result.data.skipped.join(", ")) : "", result.data.withoutMax ? t.withoutMax(result.data.withoutMax) : ""].filter(Boolean).join(" "));
    return true;
  }

  function checkProducts() {
    if (!filled.length) return (setStepError(w.noProducts), false);
    const missing = filled.find((r) => !parseMilli(r.quantity) || parseMilli(r.quantity) === 0n);
    if (missing) return (setStepError(w.missingQuantity(byId.get(missing.productId)?.name ?? "")), false);
    if (pending.length) return (setStepError(w.pendingUnusual), false);
    setStepError(null);
    return true;
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    const result = await api<{ requisition: { id: string; folio: number } }>("/api/requisitions", { body: { warehouseId: d.warehouseId, lines: lineBody(d.rows), note: d.note } });
    setBusy(false);
    if (!result.ok) {
      // RF-10: lo que es de los renglones regresa a «Productos y cantidades»; lo demás se queda en el resumen.
      if (["invalid_line_quantity", "requisition_empty", "not_found"].includes(result.error.code)) {
        go(STEPS.indexOf("products"));
        setStepError(result.error.message);
      } else setError(result.error.message);
      return;
    }
    await draft.discard();
    setDone(result.data.requisition);
  }

  async function fullView() {
    await switchView("req-new", "full", draft.save);
    router.push(viewHref("/requisiciones/nueva", "full"));
  }

  if (done) {
    const next = nextAfter("req-new", { id: done.id });
    return (
      <div className="flex flex-col gap-4" data-testid="wizard-done">
        <Alert tone="success">{owner ? w.doneOwner(done.folio) : w.done(done.folio)}</Alert>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={next.href}>{es.common.then[next.key]}</LinkButton>
          <Button variant="secondary" onClick={() => (setDone(null), draft.setIndex(0), router.refresh())}>
            {w.another}
          </Button>
        </div>
      </div>
    );
  }
  if (!draft.loaded) return <LoadingState />;
  if (draft.prompt)
    return (
      <ResumePrompt
        updatedAt={draft.prompt.updatedAt}
        stepTitle={w.steps[draft.prompt.step as (typeof STEPS)[number]] ?? w.steps.warehouse}
        onContinue={() => {
          draft.resume();
          // Las llaves de los renglones se rehacen para no chocar con las nuevas.
          draft.update((x) => ({ ...x, rows: restoreRows(x.rows) }));
        }}
        onRestart={() => void draft.restart()}
      />
    );

  const warehouse = warehouses.find((x) => x.id === d.warehouseId);
  const sourceText = d.source === "minimums" ? t.fromMinimums : d.source === "manual" ? w.sourceManual : d.source === "calculation" ? `${t.fromCalculation}: ${calculations.find((c) => c.id === d.sourceId)?.label ?? ""}` : `${t.fromTemplate}: ${templates.find((x) => x.id === d.sourceId)?.name ?? ""}`;
  const productExample = examples.product?.presentation ? w.examples.products("4", examples.product.presentation, examples.product.name) : w.examples.productsGeneric;

  return (
    <Wizard
      dirty={filled.length > 0 || d.note !== ""}
      saved
      index={draft.index}
      onIndexChange={go}
      onExit={() => router.push("/requisiciones")}
      onFullView={() => void fullView()}
      onFinish={() => void confirm()}
      review={{
        confirmLabel: owner ? t.sendOwner : t.send,
        busy,
        canConfirm: filled.length > 0 && pending.length === 0,
        extra: error ? <Alert tone="error">{error}</Alert> : null,
      }}
      steps={[
        {
          id: "warehouse",
          title: w.steps.warehouse,
          hint: w.hints.warehouse,
          example: warehouses[0] ? w.examples.warehouse(warehouseLabel(warehouses[0])) : undefined,
          canContinue: !!d.warehouseId,
          content: <SelectField label={t.warehouse} value={d.warehouseId} onChange={(e) => set({ warehouseId: e.target.value })} options={warehouses.map((x) => ({ value: x.id, label: warehouseLabel(x) }))} />,
          summary: warehouse ? warehouseLabel(warehouse) : "",
        },
        {
          id: "source",
          title: w.steps.source,
          hint: w.hints.source,
          example: w.examples.source,
          validate: addFromSource,
          content: (
            <div className="flex flex-col gap-3">
              {stepError ? <Alert tone="error">{stepError}</Alert> : null}
              <SelectField
                label={w.sourceLabel}
                value={d.source}
                onChange={(e) => set({ source: e.target.value as Source, sourceId: "" })}
                options={[
                  { value: "minimums", label: t.fromMinimums },
                  { value: "template", label: t.fromTemplate },
                  { value: "calculation", label: t.fromCalculation },
                  { value: "manual", label: w.sourceManual },
                ]}
              />
              {d.source === "calculation" ? <SelectField label={t.fromCalculation} value={d.sourceId} onChange={(e) => set({ sourceId: e.target.value })} options={[{ value: "", label: t.chooseCalculation }, ...calculations.map((c) => ({ value: c.id, label: c.label }))]} /> : null}
              {d.source === "template" ? <SelectField label={t.fromTemplate} value={d.sourceId} onChange={(e) => set({ sourceId: e.target.value })} options={[{ value: "", label: t.chooseTemplate }, ...templates.map((x) => ({ value: x.id, label: x.name }))]} /> : null}
            </div>
          ),
          summary: sourceText,
        },
        {
          id: "products",
          title: w.steps.products,
          hint: w.hints.products,
          example: productExample,
          validate: checkProducts,
          content: (
            <section aria-label={t.lines} className="flex flex-col gap-3">
              {stepError ? <Alert tone="error">{stepError}</Alert> : null}
              {notice ? <Alert tone="info">{notice}</Alert> : null}
              <RequisitionLines
                rows={d.rows}
                setRows={setRows}
                warehouseId={d.warehouseId}
                levels={levels}
                products={products}
                suppliers={suppliers}
                openKey={openKey}
                setOpenKey={setOpenKey}
                after={(r) => {
                  const odd = oddOf(r);
                  if (!odd.unusual || !odd.expected) return null;
                  const product = byId.get(r.productId);
                  const unit = unitOf(product, r.presentationId);
                  return <UnusualNotice what={w.quantityOf(product?.name ?? "")} expected={w.expectedMax(formatQuantity(odd.expected), unit)} confirmed={d.confirmed.includes(unusualKey(r))} onConfirm={() => set({ confirmed: [...d.confirmed, unusualKey(r)] })} />;
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const row = blank();
                  setRows((rs) => [...rs, row]);
                  setOpenKey(row.key);
                }}
                className="inline-flex min-h-12 items-center gap-2 self-start font-semibold text-primary"
              >
                <Icon name="plus" size={18} />
                {t.addLine}
              </button>
            </section>
          ),
          summary: (
            <div className="flex flex-col gap-1">
              <span className="font-semibold">{w.linesSummary(filled.length)}</span>
              {groupsOf(filled, supplierName).map((g) => (
                <span key={g.key} className="text-sm text-ink-muted">
                  {w.supplierSummary(g.label ?? t.noSupplier, g.rows.length)}
                </span>
              ))}
              {filled.some((r) => oddOf(r).unusual) ? <UnusualMark /> : null}
            </div>
          ),
        },
        {
          id: "note",
          title: w.steps.note,
          hint: w.hints.note,
          example: w.examples.note,
          content: <TextArea label={t.note} rows={3} maxLength={200} hint={t.noteHint} value={d.note} onChange={(e) => set({ note: e.target.value })} />,
          summary: d.note || w.noNote,
        },
      ]}
    />
  );
}
