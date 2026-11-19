"use client";

// Asistente «Corte ciego» del teléfono de piso (spec 015, RF-50 y RF-16): Efectivo por denominación, Terminales y
// Resumen. El servidor manda el corte sin nada de lo esperado y aquí no hay avisos de dato raro, para no revelarlo.
// Lo capturado se guarda por empleado en ese teléfono y por corte (RF-22); se entrega con la ruta de siempre.
import { useState } from "react";
import { es } from "@/i18n";
import type { CutView } from "@/server/services/cash/cuts";
import { Alert, LoadingState, MoneyField, ResumePrompt, Wizard, formatMoney } from "@/ui";
import { api } from "../../api";
import { useWizardDraft } from "../../wizards/use-wizard-draft";
import { DenominationCount, pesos, piecesCount, piecesTotal } from "./denominations";

const t = es.cash;
const w = t.cutWizard;
const f = t.floorWizard;
export const FLOOR_CUT_STEPS = ["cash", "methods"];
const money = (text: string) => formatMoney(Number(text.replace(/,/g, "")));

export interface FloorCount {
  pieces: Record<string, number>;
  amounts: Record<string, string>;
}

export const floorCountOf = (cut: CutView): FloorCount => ({ pieces: cut.pieces ?? {}, amounts: Object.fromEntries(cut.methods.filter((m) => !m.isCash).map((m) => [m.id, m.counted ?? ""])) });

export function FloorCutWizard({ cut, employee, autoResume, onExit, onFullView, onDelivered }: { cut: CutView; employee: string; autoResume: boolean; onExit: () => void; onFullView: (count: FloorCount) => void; onDelivered: (cut: CutView) => void }) {
  const others = cut.methods.filter((m) => !m.isCash);
  const draft = useWizardDraft<FloorCount>({ kind: "floor-cash", target: cut.id, employee, initial: floorCountOf(cut), steps: FLOOR_CUT_STEPS, autoResume });
  const d = draft.data;
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!draft.loaded) return <LoadingState />;
  if (draft.prompt) return <ResumePrompt updatedAt={draft.prompt.updatedAt} stepTitle={w.steps[draft.prompt.step as "cash" | "methods"] ?? w.steps.cash} onContinue={draft.resume} onRestart={() => void draft.restart()} />;

  const set = (patch: Partial<FloorCount>) => draft.update((x) => ({ ...x, ...patch }));
  const go = (i: number) => {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  };
  const total = piecesTotal(d.pieces);

  async function confirm() {
    setBusy(true);
    setError(null);
    const r = await api<{ cut: CutView }>(`/api/cash/cuts/${cut.id}/deliver`, { body: { pieces: d.pieces, amounts: d.amounts, employeeId: employee } });
    setBusy(false);
    if (!r.ok) {
      // RF-10: vuelve al paso del dato con su mensaje.
      if (r.error.code === "invalid_cash_pieces") go(0);
      else if (r.error.code === "invalid_amount" || r.error.code === "cut_incomplete") go(1);
      else return setError(r.error.message);
      setStepError(r.error.message);
      return;
    }
    await draft.discard();
    onDelivered(r.data.cut);
  }

  const errorBox = stepError ? <Alert tone="error">{stepError}</Alert> : null;
  return (
    <div data-testid="floor-cut-wizard">
      <Wizard
        dirty={piecesCount(d.pieces) > 0 || Object.values(d.amounts).some((a) => a.trim() !== "")}
        saved
        index={draft.index}
        onIndexChange={go}
        onExit={() => void draft.save().then(onExit)}
        onFullView={() => void draft.save().then(() => onFullView(d))}
        onFinish={() => void confirm()}
        review={{ confirmLabel: w.confirm, busy, extra: <div className="flex flex-col gap-3">{error ? <Alert tone="error">{error}</Alert> : null}<Alert tone="info">{t.countReviewIntro}</Alert></div> }}
        steps={[
          {
            id: "cash",
            title: w.steps.cash,
            hint: w.hints.cash,
            example: w.examples.cash,
            content: (
              <div className="flex flex-col gap-2">
                {errorBox}
                <DenominationCount pieces={d.pieces} onChange={(pieces) => set({ pieces })} />
              </div>
            ),
            summary: `${pesos(total)} · ${w.piecesLine(piecesCount(d.pieces))}`,
          },
          {
            id: "methods",
            title: f.methods,
            hint: w.hints.methods,
            example: others[0] ? w.examples.methods(others[0].name) : w.methodsGeneric,
            validate: () => {
              const missing = others.find((m) => !(d.amounts[m.id] ?? "").trim());
              if (missing) {
                setStepError(w.methodRequired(missing.name));
                return false;
              }
              setStepError(null);
              return true;
            },
            content: (
              <div className="flex flex-col gap-3">
                {errorBox}
                {others.length === 0 ? <p className="text-sm text-ink-muted">{f.noMethods}</p> : null}
                {others.map((m) => (
                  <MoneyField key={m.id} label={m.name} value={d.amounts[m.id] ?? ""} onChange={(e) => set({ amounts: { ...d.amounts, [m.id]: e.target.value } })} />
                ))}
              </div>
            ),
            summary: others.length ? (
              <ul className="flex flex-col text-sm">
                {others.map((m) => (
                  <li key={m.id}>
                    {m.name}: {d.amounts[m.id]?.trim() ? money(d.amounts[m.id]) : "—"}
                  </li>
                ))}
              </ul>
            ) : (
              f.noMethods
            ),
          },
        ]}
      />
    </div>
  );
}
