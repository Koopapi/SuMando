"use client";

// Asistente «Nuevo producto» (spec 015, RF-43 y RF-44): Nombre y unidad (con los parecidos), Presentaciones, Proveedor,
// Mínimo y máximo por almacén, y Resumen. Al confirmar usa las rutas de siempre: alta del producto, sus presentaciones,
// en qué se compra y se cuenta, y los niveles de cada almacén.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { levelsProblem } from "@/domain/catalog/levels";
import { nameMatches } from "@/domain/catalog/names";
import { parseFactor, parseMilli } from "@/domain/catalog/units";
import { nextAfter } from "@/domain/wizards/next";
import { es } from "@/i18n";
import type { SupplierView, WarehouseView } from "@/server/services/catalog/views";
import type { WizardExamples } from "@/server/services/wizards/examples";
import { Alert, Button, Icon, IconButton, LinkButton, LoadingState, NumberField, ResumePrompt, SelectField, TextField, Wizard, formatQuantity } from "@/ui";
import { api } from "../../api";
import { unitOptions, unitShort } from "../labels";
import { useWizardDraft } from "../../wizards/use-wizard-draft";
import { switchView, viewHref } from "../../wizards/view-switch";

const t = es.catalog;
const w = t.productWizard;
const STEPS = ["name", "presentations", "supplier", "levels"];

interface Presentation {
  key: number;
  name: string;
  factor: string;
}

export interface NewProductDraft {
  name: string;
  baseUnit: string;
  /** El nombre que se confirmó como otro producto pese al parecido (RF-44). */
  confirmedName: string;
  presentations: Presentation[];
  purchaseKey: number | null;
  countKey: number | null;
  supplierId: string;
  levels: Record<string, { min: string; max: string }>;
}

export const emptyProduct = (): NewProductDraft => ({ name: "", baseUnit: "pz", confirmedName: "", presentations: [], purchaseKey: null, countKey: null, supplierId: "", levels: {} });

export function NewProductWizard({ names, suppliers, warehouses, examples, autoResume }: { names: string[]; suppliers: SupplierView[]; warehouses: WarehouseView[]; examples: WizardExamples; autoResume: boolean }) {
  const router = useRouter();
  const draft = useWizardDraft<NewProductDraft>({ kind: "new-product", initial: emptyProduct(), steps: STEPS, autoResume });
  const d = draft.data;
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; name: string; problem: string | null } | null>(null);
  const activeSuppliers = suppliers.filter((s) => !s.archived);
  const activeWarehouses = warehouses.filter((x) => !x.archived);

  if (done) {
    const next = nextAfter("new-product", { id: done.id });
    return (
      <div className="flex flex-col gap-4" data-testid="wizard-done">
        <Alert tone={done.problem ? "warning" : "success"}>{done.problem ? w.partial(done.name, done.problem) : w.done(done.name)}</Alert>
        <div>
          <LinkButton href={next.href}>{es.common.then[next.key]}</LinkButton>
        </div>
      </div>
    );
  }
  if (!draft.loaded) return <LoadingState />;
  if (draft.prompt) return <ResumePrompt updatedAt={draft.prompt.updatedAt} stepTitle={w.steps[draft.prompt.step as keyof typeof w.steps] ?? w.steps.name} onContinue={draft.resume} onRestart={() => void draft.restart()} />;

  const set = (patch: Partial<NewProductDraft>) => draft.update((x) => ({ ...x, ...patch }));
  const unit = unitShort(d.baseUnit);
  const matches = nameMatches(d.name, names);
  const similarPending = matches.similar.length > 0 && d.confirmedName !== d.name.trim();
  const filled = d.presentations.filter((p) => p.name.trim() || p.factor.trim());
  const presName = (key: number | null) => d.presentations.find((p) => p.key === key)?.name.trim() || w.inUnit(unit);
  const levelUnit = presName(d.countKey);
  const levelRows = activeWarehouses.filter((x) => (d.levels[x.id]?.min ?? "").trim() || (d.levels[x.id]?.max ?? "").trim());
  const go = (i: number) => {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  };
  const fail = (message: string) => (setStepError(message), false);

  function checkName() {
    if (!d.name.trim()) return fail(w.nameRequired);
    if (matches.same) return fail(w.same(matches.same));
    if (similarPending) return fail(w.pendingSimilar);
    return (setStepError(null), true);
  }
  function checkPresentations() {
    const bad = d.presentations.findIndex((p) => (p.name.trim() || p.factor.trim()) && !(p.name.trim() && parseFactor(p.factor.trim()) !== null));
    if (bad >= 0) return fail(w.fillPresentation(bad + 1));
    return (setStepError(null), true);
  }
  function checkLevels() {
    for (const x of levelRows) {
      const l = d.levels[x.id];
      const min = l.min.trim() ? parseMilli(l.min.trim()) : null;
      const max = l.max.trim() ? parseMilli(l.max.trim()) : null;
      if ((l.min.trim() && min === null) || (l.max.trim() && max === null) || levelsProblem(min, max)) return fail(w.levelsProblem(x.name));
    }
    return (setStepError(null), true);
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    const created = await api<{ product: { id: string; name: string } }>("/api/products", { body: { name: d.name, baseUnit: d.baseUnit, supplierId: d.supplierId || null } });
    if (!created.ok) {
      setBusy(false);
      // RF-10: nombre o unidad regresan a su paso; el proveedor, al suyo.
      if (/name|unit/.test(created.error.code)) go(0);
      else if (/supplier/.test(created.error.code)) go(2);
      else return setError(created.error.message);
      setStepError(created.error.message);
      return;
    }
    const product = created.data.product;
    // Ya existe el producto: lo que falle desde aquí se avisa y se termina en su ficha.
    const finish = async (problem: string | null) => {
      setBusy(false);
      await draft.discard();
      setDone({ id: product.id, name: product.name, problem });
    };
    const ids = new Map<number, string>();
    for (const p of filled) {
      const r = await api<{ presentation: { id: string } }>(`/api/products/${product.id}/presentations`, { body: { name: p.name.trim(), factor: p.factor.trim() } });
      if (!r.ok) return finish(r.error.message);
      ids.set(p.key, r.data.presentation.id);
    }
    const purchase = d.purchaseKey !== null ? ids.get(d.purchaseKey) : undefined;
    const count = d.countKey !== null ? ids.get(d.countKey) : undefined;
    if (purchase || count) {
      const r = await api(`/api/products/${product.id}`, { method: "PATCH", body: { ...(purchase ? { purchasePresentationId: purchase } : {}), ...(count ? { countPresentationId: count } : {}) } });
      if (!r.ok) return finish(r.error.message);
    }
    for (const x of levelRows) {
      const l = d.levels[x.id];
      const r = await api(`/api/products/${product.id}/levels`, { method: "PUT", body: { warehouseId: x.id, presentationId: count ?? null, min: l.min.trim() || null, max: l.max.trim() || null } });
      if (!r.ok) return finish(r.error.message);
    }
    await finish(null);
  }

  const errorBox = stepError ? <Alert tone="error">{stepError}</Alert> : null;
  const presentationOptions = [{ value: "", label: w.inUnit(unit) }, ...filled.filter((p) => p.name.trim()).map((p) => ({ value: String(p.key), label: p.name.trim() }))];
  return (
    <Wizard
      dirty={d.name.trim() !== ""}
      saved
      index={draft.index}
      onIndexChange={go}
      onExit={() => router.push("/productos")}
      onFullView={() => void switchView("new-product", "full", draft.save).then(() => router.push(viewHref("/productos", "full")))}
      onFinish={() => void confirm()}
      review={{ confirmLabel: w.confirm, busy, extra: error ? <Alert tone="error">{error}</Alert> : null }}
      steps={[
        {
          id: "name",
          title: w.steps.name,
          hint: w.hints.name,
          example: examples.product?.name ?? w.examples.name,
          validate: checkName,
          content: (
            <div className="flex flex-col gap-3">
              {errorBox}
              <TextField label={t.name} maxLength={80} autoComplete="off" value={d.name} onChange={(e) => set({ name: e.target.value })} />
              {matches.same ? <Alert tone="warning">{w.same(matches.same)}</Alert> : null}
              {!matches.same && matches.similar.length ? (
                <div role="status" className="flex flex-col gap-2 rounded-md border border-warning-soft bg-warning-soft px-3 py-2 text-sm text-warning" data-similar={similarPending ? "pending" : "confirmed"}>
                  <p className="font-semibold">{w.similar(matches.similar.map((n) => `«${n}»`).join(", "))}</p>
                  {similarPending ? (
                    <div>
                      <Button variant="secondary" onClick={() => set({ confirmedName: d.name.trim() })}>
                        {w.confirmOther}
                      </Button>
                    </div>
                  ) : (
                    <p>{w.confirmedOther}</p>
                  )}
                </div>
              ) : null}
              <SelectField label={t.products.unit} value={d.baseUnit} onChange={(e) => set({ baseUnit: e.target.value })} options={unitOptions()} />
            </div>
          ),
          summary: `${d.name.trim()} · ${unit}`,
        },
        {
          id: "presentations",
          title: w.steps.presentations,
          hint: w.hints.presentations,
          example: w.examples.presentation,
          validate: checkPresentations,
          content: (
            <div className="flex flex-col gap-3">
              {errorBox}
              {d.presentations.length === 0 ? <p className="text-sm text-ink-muted">{w.noPresentations}</p> : null}
              {d.presentations.map((p, i) => (
                <div key={p.key} className="flex flex-wrap items-end gap-2 border-b border-line pb-3" data-testid="new-presentation">
                  <TextField label={w.presentationName(i + 1)} maxLength={40} className="min-w-0 flex-1 basis-48" value={p.name} onChange={(e) => set({ presentations: d.presentations.map((x) => (x.key === p.key ? { ...x, name: e.target.value } : x)) })} />
                  <NumberField label={w.presentationFactor(i + 1, unit)} className="w-40" value={p.factor} onChange={(e) => set({ presentations: d.presentations.map((x) => (x.key === p.key ? { ...x, factor: e.target.value } : x)) })} />
                  <IconButton label={w.removePresentation(p.name)} onClick={() => set({ presentations: d.presentations.filter((x) => x.key !== p.key), purchaseKey: d.purchaseKey === p.key ? null : d.purchaseKey, countKey: d.countKey === p.key ? null : d.countKey })}>
                    <Icon name="close" />
                  </IconButton>
                </div>
              ))}
              <Button variant="secondary" className="self-start" onClick={() => set({ presentations: [...d.presentations, { key: Math.max(0, ...d.presentations.map((x) => x.key)) + 1, name: "", factor: "" }] })}>
                {w.addPresentation}
              </Button>
              {filled.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField label={w.purchaseIn} value={d.purchaseKey === null ? "" : String(d.purchaseKey)} onChange={(e) => set({ purchaseKey: e.target.value ? Number(e.target.value) : null })} options={presentationOptions} />
                  <SelectField label={w.countIn} value={d.countKey === null ? "" : String(d.countKey)} onChange={(e) => set({ countKey: e.target.value ? Number(e.target.value) : null })} options={presentationOptions} />
                </div>
              ) : null}
            </div>
          ),
          summary: filled.length ? (
            <div className="flex flex-col gap-1 text-sm">
              {filled.map((p) => (
                <span key={p.key}>{w.presentationLine(p.name.trim(), formatQuantity(p.factor.trim() || "0"), unit)}</span>
              ))}
              <span className="text-ink-muted">
                {w.purchaseIn}: {presName(d.purchaseKey)} · {w.countIn}: {presName(d.countKey)}
              </span>
            </div>
          ) : (
            w.noPresentations
          ),
        },
        {
          id: "supplier",
          title: w.steps.supplier,
          hint: w.hints.supplier,
          example: examples.supplier ?? activeSuppliers[0]?.name,
          content: (
            <div className="flex flex-col gap-3">
              {errorBox}
              <SelectField label={t.products.supplier} value={d.supplierId} onChange={(e) => set({ supplierId: e.target.value })} options={[{ value: "", label: t.products.noSupplier }, ...activeSuppliers.map((s) => ({ value: s.id, label: s.name }))]} />
            </div>
          ),
          summary: activeSuppliers.find((s) => s.id === d.supplierId)?.name ?? t.products.noSupplier,
        },
        {
          id: "levels",
          title: w.steps.levels,
          hint: w.hints.levels,
          example: w.examples.levels,
          validate: checkLevels,
          content: (
            <div className="flex flex-col gap-3">
              {errorBox}
              {activeWarehouses.length === 0 ? <p className="text-sm text-ink-muted">{w.noWarehouses}</p> : <p className="text-sm font-semibold">{w.levelsIn(levelUnit)}</p>}
              {activeWarehouses.map((x) => {
                const l = d.levels[x.id] ?? { min: "", max: "" };
                const setLevel = (patch: Partial<{ min: string; max: string }>) => set({ levels: { ...d.levels, [x.id]: { ...l, ...patch } } });
                return (
                  <fieldset key={x.id} className="grid min-w-0 gap-3 border-t border-line pt-3 sm:grid-cols-2">
                    <legend className="font-semibold">{x.name}</legend>
                    <NumberField label={w.minOf(x.name)} value={l.min} onChange={(e) => setLevel({ min: e.target.value })} />
                    <NumberField label={w.maxOf(x.name)} value={l.max} onChange={(e) => setLevel({ max: e.target.value })} />
                  </fieldset>
                );
              })}
            </div>
          ),
          summary: levelRows.length ? (
            <ul className="flex flex-col text-sm">
              {levelRows.map((x) => (
                <li key={x.id}>{w.levelLine(x.name, d.levels[x.id].min.trim() ? `${formatQuantity(d.levels[x.id].min.trim())} ${levelUnit}` : t.none, d.levels[x.id].max.trim() ? `${formatQuantity(d.levels[x.id].max.trim())} ${levelUnit}` : t.none)}</li>
              ))}
            </ul>
          ) : (
            w.noLevels
          ),
        },
      ]}
    />
  );
}
