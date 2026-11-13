"use client";

// Spec 005 RF-44 a RF-51: conteo de un área con lo esperado a la vista, «Igual», «Lo que falta, igual» y borrador
// en el dispositivo hasta aplicar. Si la existencia cambió mientras se contaba, el servidor pide confirmar.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { es } from "@/i18n";
import type { CountSheetView } from "@/server/services/inventory/counts";
import { fillMissing } from "@/domain/inventory/count";
import { Alert, Button, NumberField, PageHeader, SelectField, useToast } from "@/ui";
import { api } from "../api";
import { unitShort } from "../catalog/labels";
import { withMeasure } from "./labels";

const t = es.inventory;

type Draft = { values: Record<string, string>; presentations: Record<string, string> };

function readDraft(key: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function CountSheet({ sheet, draftKey }: { sheet: CountSheetView; draftKey: string }) {
  const router = useRouter();
  const toast = useToast();
  const initialPresentations = () => Object.fromEntries(sheet.lines.map((l) => [l.productId, l.countPresentationId ?? ""]));
  const [draft, setDraft] = useState<Draft>({ values: {}, presentations: initialPresentations() });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // RF-48: lo capturado sobrevive a cerrar o recargar, en este dispositivo.
  useEffect(() => {
    const saved = readDraft(draftKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- se lee el borrador del dispositivo una sola vez al montar
    if (saved) setDraft({ values: saved.values ?? {}, presentations: { ...initialPresentations(), ...(saved.presentations ?? {}) } });
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // Sin almacenamiento: el conteo sigue, solo que no sobrevive a recargar.
    }
  }, [draft, draftKey, loaded]);

  const expectedIn = (productId: string) => {
    const line = sheet.lines.find((l) => l.productId === productId)!;
    // «Igual» copia lo esperado en la presentación de conteo; si se eligió otra, se vuelve a la de conteo.
    return { value: line.expected.startsWith("-") ? "0" : line.expected, presentation: line.countPresentationId ?? "" };
  };
  const setValue = (productId: string, value: string) => setDraft((d) => ({ ...d, values: { ...d.values, [productId]: value } }));
  const same = (productId: string) => {
    const e = expectedIn(productId);
    setDraft((d) => ({ values: { ...d.values, [productId]: e.value }, presentations: { ...d.presentations, [productId]: e.presentation } }));
  };
  const fillRest = () =>
    setDraft((d) => {
      const expected = Object.fromEntries(sheet.lines.map((l) => [l.productId, expectedIn(l.productId).value]));
      const missing = sheet.lines.filter((l) => !d.values[l.productId]).map((l) => l.productId);
      return { values: fillMissing(d.values, expected), presentations: { ...d.presentations, ...Object.fromEntries(missing.map((id) => [id, expectedIn(id).presentation])) } };
    });

  const captured = sheet.lines.filter((l) => (draft.values[l.productId] ?? "").trim() !== "");

  async function apply(confirm: boolean) {
    if (captured.length === 0) {
      setError(t.nothingCaptured);
      return;
    }
    setBusy(true);
    setError(null);
    const lines = captured.map((l) => ({ productId: l.productId, quantity: draft.values[l.productId].trim(), presentationId: draft.presentations[l.productId] || null, seen: l.seen }));
    const result = await api("/api/inventory/counts", { body: { areaId: sheet.area.id, lines, confirm } });
    setBusy(false);
    if (!result.ok) {
      if (result.error.code === "count_changed") setChanged(result.error.message);
      else setError(result.error.message);
      return;
    }
    try {
      window.localStorage.removeItem(draftKey);
    } catch {}
    toast.success(t.applied);
    router.push("/inventario/conteo");
  }

  return (
    <>
      <PageHeader title={t.sheetTitle(sheet.area.name)} subtitle={t.sheetIntro(sheet.warehouse.name)} figure={`${captured.length}/${sheet.lines.length}`} figureLabel={t.progress(captured.length, sheet.lines.length)} />
      <p className="text-sm text-ink-muted">{t.draftKept}</p>
      {sheet.lines.length === 0 ? <p className="text-sm text-ink-muted">{t.emptySheet}</p> : null}
      <ol className="flex flex-col">
        {sheet.lines.map((l) => {
          const presentations = l.presentations.map((p) => ({ value: p.id ?? "", label: p.name ?? unitShort(l.baseUnit) }));
          return (
            <li key={l.productId} className="border-t border-line py-3" data-testid="count-line">
              <fieldset className="grid grid-cols-12 items-end gap-3">
                <legend className="col-span-12 mb-1 flex w-full flex-wrap justify-between gap-x-3">
                  <span className="font-semibold">{l.name}</span>
                  <span className={`text-sm tabular-nums ${l.expected.startsWith("-") ? "text-danger" : "text-ink-muted"}`}>{t.expected(withMeasure(l.expected, l))}</span>
                </legend>
                <NumberField label={t.countedOf(l.name)} hideLabel className="col-span-5 lg:col-span-3" value={draft.values[l.productId] ?? ""} onChange={(e) => setValue(l.productId, e.target.value)} />
                <SelectField
                  label={t.presentationOf(l.name)}
                  hideLabel
                  className="col-span-4 lg:col-span-3"
                  value={draft.presentations[l.productId] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, presentations: { ...d.presentations, [l.productId]: e.target.value } }))}
                  options={presentations}
                />
                <div className="col-span-3 lg:col-span-2">
                  <Button variant="secondary" full aria-label={t.sameFor(l.name)} onClick={() => same(l.productId)}>
                    {t.same}
                  </Button>
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>
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
      <div className="sticky bottom-(--nav-space) -mx-4 flex flex-wrap justify-end gap-2 border-t border-line bg-surface px-4 py-3 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0">
        <Button variant="secondary" onClick={fillRest}>
          {t.fillRest}
        </Button>
        <Button loading={busy} onClick={() => void apply(false)}>
          {t.apply}
        </Button>
      </div>
    </>
  );
}
