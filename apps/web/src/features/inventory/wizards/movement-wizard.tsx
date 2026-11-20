"use client";

// Asistentes «Entrada», «Salida» y «Traspaso» (spec 015, RF-34 a RF-36 y RF-13): Almacén (u Origen), Proveedor,
// Motivo o Destino, Productos y cantidades, y Resumen. Registran con `/api/inventory/movements` y
// `/api/inventory/transfers`, como las pantallas completas. Avisan de una entrada de más del triple del máximo y de
// una salida de más de la mitad de la existencia; el traspaso no lleva aviso.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseMilli } from "@/domain/catalog/units";
import type { WizardKind } from "@/domain/wizards/drafts";
import { nextAfter } from "@/domain/wizards/next";
import { unusual, type UnusualResult } from "@/domain/wizards/unusual";
import { es } from "@/i18n";
import type { DestinationView } from "@/server/services/inventory/views";
import type { MovementWizardData } from "@/server/services/wizards/movement-page";
import { Alert, LinkButton, LoadingState, ResumePrompt, SelectField, TextArea, TextField, UnusualMark, UnusualNotice, Wizard, formatQuantity } from "@/ui";
import { api } from "../../api";
import { unitShort } from "../../catalog/labels";
import { useWizardDraft } from "../../wizards/use-wizard-draft";
import { switchView, viewHref } from "../../wizards/view-switch";
import { warehouseLabel } from "../labels";
import { blankLine, LinesEditor, linesBody, type LineDraft } from "../lines-editor";

const t = es.inventory;
const w = t.movementWizard;

export type MovementWizardKind = "entry" | "exit" | "transfer";

export interface MovementDraft {
  warehouseId: string;
  supplierId: string;
  reference: string;
  reason: string;
  to: string;
  note: string;
  rows: LineDraft[];
  confirmed: string[];
}

export const WIZARD_KIND: Record<MovementWizardKind, WizardKind> = { entry: "inv-entry", exit: "inv-exit", transfer: "inv-transfer" };
export const FULL_PATH: Record<MovementWizardKind, string> = { entry: "/inventario/entrada", exit: "/inventario/salida", transfer: "/inventario/traspaso" };
const MIDDLE: Record<MovementWizardKind, "supplier" | "reason" | "to"> = { entry: "supplier", exit: "reason", transfer: "to" };
const stepsOf = (kind: MovementWizardKind) => ["warehouse", MIDDLE[kind], "products"];

export const emptyMovement = (warehouseId = ""): MovementDraft => ({ warehouseId, supplierId: "", reference: "", reason: "waste", to: "", note: "", rows: [blankLine()], confirmed: [] });

const unusualKey = (r: LineDraft) => `${r.productId}|${r.presentationId}|${r.quantity.trim()}`;

export function MovementWizard({ kind, data, destinations = [], initialWarehouseId, autoResume }: { kind: MovementWizardKind; data: MovementWizardData; destinations?: DestinationView[]; initialWarehouseId?: string; autoResume: boolean }) {
  const router = useRouter();
  const { warehouses, products, suppliers, levels } = data;
  const wizardKind = WIZARD_KIND[kind];
  const STEPS = stepsOf(kind);
  const start = initialWarehouseId ?? (warehouses.length === 1 ? warehouses[0].id : "");
  const draft = useWizardDraft<MovementDraft>({ kind: wizardKind, initial: emptyMovement(start), steps: STEPS, autoResume });
  const d = draft.data;
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const byId = new Map(products.map((p) => [p.id, p]));
  const warehouse = warehouses.find((x) => x.id === d.warehouseId);
  const destinationOptions = destinations.flatMap((b) => b.warehouses.filter((x) => x.id !== d.warehouseId).map((x) => ({ value: x.id, label: t.destinationOption(b.name, x.name), own: b.own })));
  const destination = destinationOptions.find((x) => x.value === d.to);
  const supplier = suppliers.find((s) => s.id === d.supplierId);

  if (done) {
    const next = nextAfter(wizardKind, { id: done });
    return (
      <div className="flex flex-col gap-4" data-testid="wizard-done">
        <Alert tone="success">{w.done[kind]}</Alert>
        <div>
          <LinkButton href={next.href}>{es.common.then[next.key]}</LinkButton>
        </div>
      </div>
    );
  }
  if (!warehouses.length) return <Alert tone="info">{t.purchaseData.noWarehouses}</Alert>;
  if (!draft.loaded) return <LoadingState />;
  if (draft.prompt) return <ResumePrompt updatedAt={draft.prompt.updatedAt} stepTitle={w.steps[draft.prompt.step as keyof typeof w.steps] ?? w.steps.warehouse} onContinue={draft.resume} onRestart={() => void draft.restart()} />;

  const set = (patch: Partial<MovementDraft>) => draft.update((x) => ({ ...x, ...patch }));
  const filled = d.rows.filter((r) => r.productId);
  const unitOf = (r: LineDraft) => {
    const p = byId.get(r.productId);
    return p ? (p.presentations.find((x) => (x.id ?? "") === r.presentationId)?.name ?? unitShort(p.baseUnit)) : "";
  };
  const level = (r: LineDraft) => levels[d.warehouseId]?.[r.productId]?.[r.presentationId];
  // RF-13: entrada contra el triple del máximo; salida contra la mitad de la existencia, en la presentación capturada.
  const oddOf = (r: LineDraft): UnusualResult => {
    if (!r.productId || !r.quantity.trim()) return { unusual: false, expected: null };
    if (kind === "entry") return unusual("entry", r.quantity, level(r)?.max ?? null);
    if (kind === "exit") return unusual("exit", r.quantity, level(r)?.stock ?? "0");
    return { unusual: false, expected: null };
  };
  const pending = filled.filter((r) => oddOf(r).unusual && !d.confirmed.includes(unusualKey(r)));
  const go = (i: number) => {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  };
  const fail = (message: string) => (setStepError(message), false);

  function checkWarehouse() {
    if (!warehouse) return fail(w.chooseWarehouse);
    return (setStepError(null), true);
  }
  function checkMiddle() {
    if (kind === "exit" && d.reason === "other" && !d.note.trim()) return fail(w.noteNeeded);
    if (kind === "transfer" && !destination) return fail(w.chooseDestination);
    return (setStepError(null), true);
  }
  function checkProducts() {
    if (!filled.length) return fail(w.addProducts);
    const bad = filled.find((r) => {
      const q = parseMilli(r.quantity.trim());
      return q === null || q === 0n;
    });
    if (bad) return fail(w.invalidLine(byId.get(bad.productId)?.name ?? ""));
    if (pending.length) return fail(w.pendingUnusual);
    return (setStepError(null), true);
  }

  // RF-10: el error del servidor regresa al paso donde se corrige.
  function stepOfError(code: string, params: Record<string, unknown> | undefined) {
    if (params?.productId || /quantity|line|movement_empty|product|presentation/.test(code)) return 2;
    if (/supplier|reference|reason|note|destination|to_warehouse|same_warehouse/.test(code)) return 1;
    if (/warehouse/.test(code)) return 0;
    return null;
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    const lines = linesBody(d.rows);
    const result =
      kind === "transfer"
        ? await api<{ transfer: { id: string } }>("/api/inventory/transfers", { body: { fromWarehouseId: d.warehouseId, toWarehouseId: d.to, lines, note: d.note } })
        : await api<{ movement: { id: string } }>("/api/inventory/movements", {
            body: { kind, warehouseId: d.warehouseId, lines, note: d.note, ...(kind === "entry" ? { supplierId: d.supplierId || null, reference: d.reference } : { reason: d.reason }) },
          });
    setBusy(false);
    if (!result.ok) {
      const at = stepOfError(result.error.code, result.error.params as Record<string, unknown> | undefined);
      if (at === null) setError(result.error.message);
      else {
        go(at);
        setStepError(result.error.message);
      }
      return;
    }
    await draft.discard();
    setDone("transfer" in result.data ? result.data.transfer.id : result.data.movement.id);
  }

  const first = products[0];
  const exampleLine = first ? w.examples.line("2", first.presentations.find((p) => p.id === first.countPresentationId)?.name ?? unitShort(first.baseUnit), first.name) : w.examplesGeneric.line;
  const errorBox = stepError ? <Alert tone="error">{stepError}</Alert> : null;
  const noteField = <TextArea label={kind === "exit" && d.reason === "other" ? t.noteRequired : t.note} rows={2} maxLength={200} hint={t.noteHint} value={d.note} onChange={(e) => set({ note: e.target.value })} />;

  const middle =
    kind === "entry"
      ? {
          id: "supplier",
          title: w.steps.supplier,
          hint: w.hints.supplier,
          example: suppliers[0]?.name ?? w.examplesGeneric.supplier,
          validate: checkMiddle,
          content: (
            <div className="flex flex-col gap-3">
              {errorBox}
              <SelectField label={t.supplier} value={d.supplierId} onChange={(e) => set({ supplierId: e.target.value })} options={[{ value: "", label: t.noSupplier }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
              <TextField label={t.reference} maxLength={40} hint={t.referenceHint} value={d.reference} onChange={(e) => set({ reference: e.target.value })} />
            </div>
          ),
          summary: `${supplier?.name ?? t.noSupplier} · ${d.reference.trim() || w.noReference}`,
        }
      : kind === "exit"
        ? {
            id: "reason",
            title: w.steps.reason,
            hint: w.hints.reason,
            example: w.examples.reason,
            validate: checkMiddle,
            content: (
              <div className="flex flex-col gap-3">
                {errorBox}
                <SelectField label={t.reason} value={d.reason} onChange={(e) => set({ reason: e.target.value })} options={Object.entries(t.reasons).map(([value, label]) => ({ value, label }))} />
                {noteField}
              </div>
            ),
            summary: `${t.reasons[d.reason] ?? d.reason} · ${d.note.trim() || w.noNote}`,
          }
        : {
            id: "to",
            title: w.steps.to,
            hint: w.hints.to,
            example: destinationOptions[0]?.label,
            validate: checkMiddle,
            content: (
              <div className="flex flex-col gap-3">
                {errorBox}
                <SelectField label={t.to} value={d.to} onChange={(e) => set({ to: e.target.value })} options={[{ value: "", label: t.chooseDestination }, ...destinationOptions]} />
                {destination && !destination.own ? <Alert tone="info">{w.inTransit}</Alert> : null}
              </div>
            ),
            summary: destination?.label ?? "",
          };

  return (
    <Wizard
      dirty={filled.length > 0}
      saved
      index={draft.index}
      onIndexChange={go}
      onExit={() => router.push("/inventario")}
      onFullView={() => void switchView(wizardKind, "full", draft.save).then(() => router.push(viewHref(FULL_PATH[kind], "full")))}
      onFinish={() => void confirm()}
      review={{ confirmLabel: w.confirm[kind], busy, extra: error ? <Alert tone="error">{error}</Alert> : kind === "transfer" && destination && !destination.own ? <Alert tone="info">{w.inTransit}</Alert> : null }}
      steps={[
        {
          id: "warehouse",
          title: kind === "transfer" ? w.steps.from : w.steps.warehouse,
          hint: kind === "transfer" ? w.hints.from : w.hints.warehouse[kind],
          example: warehouses[0] ? warehouseLabel(warehouses[0]) : w.examplesGeneric.warehouse,
          validate: checkWarehouse,
          content: (
            <div className="flex flex-col gap-3">
              {errorBox}
              <SelectField
                label={kind === "transfer" ? t.from : t.warehouse}
                value={d.warehouseId}
                onChange={(e) => set({ warehouseId: e.target.value, confirmed: [], to: e.target.value === d.to ? "" : d.to })}
                options={[{ value: "", label: w.chooseWarehouse }, ...warehouses.map((x) => ({ value: x.id, label: warehouseLabel(x) }))]}
              />
            </div>
          ),
          summary: warehouse ? warehouseLabel(warehouse) : "",
        },
        middle,
        {
          id: "products",
          title: w.steps.products,
          hint: w.hints.products[kind],
          example: exampleLine,
          validate: checkProducts,
          content: (
            <div className="flex flex-col gap-4">
              {errorBox}
              <LinesEditor
                rows={d.rows}
                onChange={(rows) => set({ rows })}
                products={products}
                after={(r) => {
                  const odd = oddOf(r);
                  if (!odd.unusual || !odd.expected) return null;
                  const product = byId.get(r.productId);
                  const ref = `${formatQuantity(odd.expected)} ${unitOf(r)}`;
                  return (
                    <div className="pb-3">
                      <UnusualNotice what={w.quantityOf(product?.name ?? "")} expected={kind === "entry" ? w.expectedEntry(ref) : w.expectedExit(ref)} confirmed={d.confirmed.includes(unusualKey(r))} onConfirm={() => set({ confirmed: [...d.confirmed, unusualKey(r)] })} />
                    </div>
                  );
                }}
              />
              {kind !== "exit" ? noteField : null}
            </div>
          ),
          summary: (
            <div className="flex flex-col gap-1">
              <ul className="flex flex-col text-sm">
                {filled.map((r) => (
                  <li key={r.key} className="flex flex-wrap items-center gap-x-2">
                    {t.quantityWith(formatQuantity(r.quantity.trim() || "0"), unitOf(r))} · {byId.get(r.productId)?.name}
                    {oddOf(r).unusual ? <UnusualMark /> : null}
                  </li>
                ))}
              </ul>
              {kind !== "exit" && d.note.trim() ? <span className="text-sm text-ink-muted">{d.note.trim()}</span> : null}
            </div>
          ),
        },
      ]}
    />
  );
}
