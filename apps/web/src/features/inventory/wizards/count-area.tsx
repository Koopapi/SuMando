"use client";

// Asistente «Contar un área» (spec 015, RF-33 y RF-13): Almacén y área, Conteo producto por producto (con «Igual» y
// aviso cuando el conteo se aleja más del 30 % de lo esperado) y Resumen con las diferencias. Aplica con
// `/api/inventory/counts`, como la hoja completa; si la existencia cambió mientras se contaba, pide confirmar.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { parseMilli } from "@/domain/catalog/units";
import { nextAfter } from "@/domain/wizards/next";
import { unusual } from "@/domain/wizards/unusual";
import { es } from "@/i18n";
import type { CountSheetView } from "@/server/services/inventory/counts";
import type { AreaCountView, CountSheetLine } from "@/server/services/inventory/views";
import { Alert, Button, LinkButton, LoadingState, NumberField, ResumePrompt, SelectField, UnusualMark, UnusualNotice, Wizard, formatQuantity } from "@/ui";
import { api } from "../../api";
import { unitShort } from "../../catalog/labels";
import { useWizardDraft } from "../../wizards/use-wizard-draft";
import { switchView, viewHref } from "../../wizards/view-switch";
import { withMeasure } from "../labels";

const t = es.inventory;
const w = t.countWizard;
const STEPS = ["area", "count"];

export interface CountDraft {
  areaId: string;
  values: Record<string, string>;
  presentations: Record<string, string>;
  /** RF-21: la existencia que se vio al empezar, para que el servidor avise si cambió mientras se contaba. */
  seen: Record<string, string> | null;
  cursor: number;
  confirmed: string[];
}

export const emptyCount = (areaId = ""): CountDraft => ({ areaId, values: {}, presentations: {}, seen: null, cursor: 0, confirmed: [] });

/** Lo esperado sin signo: una existencia negativa se cuenta contra cero, como «Igual» en la hoja completa. */
const expectedOf = (l: CountSheetLine) => (l.expected.startsWith("-") ? "0" : l.expected);

export function CountAreaWizard({ areas, area, autoResume }: { areas: AreaCountView[]; area?: string; autoResume: boolean }) {
  const router = useRouter();
  const countable = areas.filter((a) => a.warehouse && a.products > 0);
  const start = countable.find((a) => a.id === area)?.id ?? (countable.length === 1 ? countable[0].id : "");
  const draft = useWizardDraft<CountDraft>({ kind: "inv-count", initial: emptyCount(start), steps: STEPS, autoResume });
  const d = draft.data;
  const [sheet, setSheet] = useState<CountSheetView | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const chosen = countable.find((a) => a.id === d.areaId);

  async function loadSheet(areaId: string): Promise<CountSheetView | null> {
    const r = await api<CountSheetView>(`/api/inventory/counts/${areaId}`);
    if (!r.ok) return (setStepError(r.error.message), null);
    setSheet(r.data);
    return r.data;
  }

  // Al retomar en el paso del conteo, la lista del área se pide de nuevo; lo esperado se compara contra lo que se vio.
  useEffect(() => {
    if (!draft.loaded || draft.prompt || !d.areaId || sheet?.area.id === d.areaId || draft.index === 0) return;
    void api<CountSheetView>(`/api/inventory/counts/${d.areaId}`).then((r) => (r.ok ? setSheet(r.data) : setStepError(r.error.message)));
  }, [draft.loaded, draft.prompt, d.areaId, draft.index, sheet?.area.id]);

  if (done) {
    const next = nextAfter("inv-count", { id: d.areaId });
    return (
      <div className="flex flex-col gap-4" data-testid="wizard-done">
        <Alert tone="success">{w.done(done)}</Alert>
        <div>
          <LinkButton href={next.href}>{es.common.then[next.key]}</LinkButton>
        </div>
      </div>
    );
  }
  if (!countable.length) return <Alert tone="info">{w.noAreas}</Alert>;
  if (!draft.loaded) return <LoadingState />;
  if (draft.prompt) return <ResumePrompt updatedAt={draft.prompt.updatedAt} stepTitle={w.steps[draft.prompt.step as keyof typeof w.steps] ?? w.steps.area} onContinue={draft.resume} onRestart={() => void draft.restart()} />;

  const lines = sheet && sheet.area.id === d.areaId ? sheet.lines : [];
  const valueOf = (l: CountSheetLine) => d.values[l.productId] ?? "";
  const presOf = (l: CountSheetLine) => d.presentations[l.productId] ?? l.countPresentationId ?? "";
  const unitOf = (l: CountSheetLine) => {
    const p = l.presentations.find((x) => (x.id ?? "") === presOf(l));
    return p?.name ?? unitShort(l.baseUnit);
  };
  const key = (l: CountSheetLine) => `${l.productId}|${presOf(l)}|${valueOf(l).trim()}`;
  // Solo se compara en la presentación de conteo, la misma en que viene lo esperado (RF-13).
  const oddOf = (l: CountSheetLine) => (valueOf(l).trim() && presOf(l) === (l.countPresentationId ?? "") ? unusual("count", valueOf(l), expectedOf(l)) : { unusual: false, expected: null });
  const pendingOdd = (l: CountSheetLine) => oddOf(l).unusual && !d.confirmed.includes(key(l));
  const captured = lines.filter((l) => valueOf(l).trim() !== "");
  const differs = (l: CountSheetLine) => presOf(l) !== (l.countPresentationId ?? "") || parseMilli(valueOf(l).trim()) !== parseMilli(expectedOf(l));
  const differences = captured.filter(differs);
  const cursor = Math.min(d.cursor, Math.max(lines.length - 1, 0));
  const line = lines[cursor];

  const go = (i: number) => {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  };
  const setLine = (l: CountSheetLine, patch: { value?: string; presentation?: string }) =>
    draft.update((x) => ({
      ...x,
      values: patch.value === undefined ? x.values : { ...x.values, [l.productId]: patch.value },
      presentations: patch.presentation === undefined ? x.presentations : { ...x.presentations, [l.productId]: patch.presentation },
    }));
  const moveTo = (i: number) => {
    setStepError(null);
    draft.update((x) => ({ ...x, cursor: i }));
  };

  async function checkArea() {
    if (!chosen) return (setStepError(w.chooseArea), false);
    const s = sheet?.area.id === d.areaId ? sheet : await loadSheet(d.areaId);
    if (!s) return false;
    if (!s.lines.length) return (setStepError(t.emptySheet), false);
    if (!d.seen) draft.update((x) => ({ ...x, seen: Object.fromEntries(s.lines.map((l) => [l.productId, l.seen])) }));
    setStepError(null);
    return true;
  }

  // «Siguiente» recorre los productos uno a uno; en el último, pasa al resumen.
  function checkCount() {
    if (!line) return false;
    const raw = valueOf(line).trim();
    if (raw && parseMilli(raw) === null) return (setStepError(es.errors.invalid_quantity), false);
    if (pendingOdd(line)) return (setStepError(w.pendingUnusual), false);
    setStepError(null);
    if (cursor < lines.length - 1) {
      moveTo(cursor + 1);
      return false;
    }
    return true;
  }

  async function apply(confirm: boolean) {
    if (!chosen) return;
    if (!captured.length) return setError(t.nothingCaptured);
    setBusy(true);
    setError(null);
    const body = { areaId: d.areaId, lines: captured.map((l) => ({ productId: l.productId, quantity: valueOf(l).trim(), presentationId: presOf(l) || null, seen: d.seen?.[l.productId] ?? l.seen })), confirm };
    const result = await api("/api/inventory/counts", { body });
    setBusy(false);
    if (!result.ok) {
      if (result.error.code === "count_changed") return setChanged(result.error.message);
      const productId = (result.error.params as { productId?: string } | undefined)?.productId;
      const at = productId ? lines.findIndex((l) => l.productId === productId) : -1;
      // RF-10: el producto con el error vuelve a su lugar en el conteo.
      if (at >= 0) {
        moveTo(at);
        go(1);
        setStepError(result.error.message);
      } else setError(result.error.message);
      return;
    }
    await draft.discard();
    setDone(chosen.name);
  }

  const fullView = () =>
    void switchView("inv-count", "full", draft.save).then(() => router.push(d.areaId ? viewHref(`/inventario/conteo/${d.areaId}`, "full") : viewHref("/inventario/conteo", "full", false)));

  return (
    <Wizard
      dirty={captured.length > 0}
      saved
      index={draft.index}
      onIndexChange={go}
      onExit={() => router.push("/inventario")}
      onFullView={fullView}
      onFinish={() => void apply(false)}
      review={{
        confirmLabel: t.apply,
        busy,
        canConfirm: captured.length > 0,
        extra: (
          <div className="flex flex-col gap-3">
            {changed ? (
              <Alert tone="warning">
                <span className="flex flex-col gap-3">
                  {changed}
                  <span>
                    <Button loading={busy} onClick={() => void apply(true)}>
                      {t.applyAnyway}
                    </Button>
                  </span>
                </span>
              </Alert>
            ) : null}
            {error ? <Alert tone="error">{error}</Alert> : null}
            {!captured.length ? <Alert tone="warning">{t.nothingCaptured}</Alert> : null}
          </div>
        ),
      }}
      steps={[
        {
          id: "area",
          title: w.steps.area,
          hint: w.hints.area,
          example: countable[0] ? w.examples.area(countable[0].name) : w.examplesGeneric.area,
          validate: checkArea,
          content: (
            <div className="flex flex-col gap-3">
              {stepError ? <Alert tone="error">{stepError}</Alert> : null}
              <SelectField
                label={w.areaLabel}
                value={d.areaId}
                onChange={(e) => {
                  setStepError(null);
                  draft.update(() => emptyCount(e.target.value));
                }}
                options={[{ value: "", label: w.chooseArea }, ...countable.map((a) => ({ value: a.id, label: w.areaOption(a.name, a.warehouse!.name, a.products) }))]}
              />
            </div>
          ),
          summary: chosen ? w.areaOption(chosen.name, chosen.warehouse!.name, chosen.products) : "",
        },
        {
          id: "count",
          title: w.steps.count,
          hint: w.hints.count,
          example: line ? w.examples.count(formatQuantity(expectedOf(line)), unitOf(line), line.name) : w.examplesGeneric.count,
          validate: checkCount,
          content: !line ? (
            <LoadingState label={w.loading} />
          ) : (
            <div className="flex flex-col gap-3" data-testid="count-product">
              {stepError ? <Alert tone="error">{stepError}</Alert> : null}
              <div className="flex flex-wrap items-baseline justify-between gap-x-3" aria-live="polite">
                <p className="text-xs font-semibold tracking-widest text-ink-muted uppercase">{w.position(cursor + 1, lines.length)}</p>
                <p className="text-sm text-ink-muted">{w.counted(captured.length, lines.length)}</p>
              </div>
              <div className="flex min-w-0 flex-col">
                <h3 className="font-brand text-lg font-bold break-words">{line.name}</h3>
                <p className={`text-sm tabular-nums ${line.expected.startsWith("-") ? "text-danger" : "text-ink-muted"}`}>{t.expected(withMeasure(line.expected, line))}</p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <NumberField key={line.productId} label={w.countOf(line.name)} className="min-w-0 flex-1" value={valueOf(line)} onChange={(e) => setLine(line, { value: e.target.value })} trailing={<span className="text-sm text-ink-muted">{unitOf(line)}</span>} />
                <Button variant="secondary" aria-label={t.sameFor(line.name)} onClick={() => setLine(line, { value: expectedOf(line), presentation: line.countPresentationId ?? "" })}>
                  {t.same}
                </Button>
              </div>
              {line.presentations.length > 1 ? (
                <SelectField label={t.presentationOf(line.name)} value={presOf(line)} onChange={(e) => setLine(line, { presentation: e.target.value })} options={line.presentations.map((p) => ({ value: p.id ?? "", label: p.name ?? unitShort(line.baseUnit) }))} />
              ) : null}
              {(() => {
                const odd = oddOf(line);
                if (!odd.unusual || !odd.expected) return null;
                return <UnusualNotice what={w.what(line.name)} expected={withMeasure(odd.expected, line)} confirmed={d.confirmed.includes(key(line))} onConfirm={() => draft.update((x) => ({ ...x, confirmed: [...x.confirmed, key(line)] }))} />;
              })()}
              <div>
                <Button variant="ghost" disabled={cursor === 0} onClick={() => moveTo(cursor - 1)}>
                  {w.previousProduct}
                </Button>
              </div>
            </div>
          ),
          summary: (
            <div className="flex flex-col gap-1">
              <span className="font-semibold">{w.differences(differences.length)}</span>
              <ul className="flex flex-col text-sm">
                {differences.map((l) => (
                  <li key={l.productId} className="flex flex-wrap items-center gap-x-2">
                    {w.difference(l.name, withMeasure(expectedOf(l), l), t.quantityWith(formatQuantity(valueOf(l).trim()), unitOf(l)))}
                    {oddOf(l).unusual ? <UnusualMark /> : null}
                  </li>
                ))}
              </ul>
              {lines.length > captured.length ? <span className="text-sm text-ink-muted">{w.notCounted(lines.length - captured.length)}</span> : null}
            </div>
          ),
        },
      ]}
    />
  );
}
