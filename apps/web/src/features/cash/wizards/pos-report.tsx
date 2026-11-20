"use client";

// Asistente «Reporte del punto de venta» (spec 015, RF-42): Ventas por forma de pago y Resumen con lo que no cuadra.
// Lo que no cuadra lo calcula el servidor (`pos-preview`, sin guardar); al confirmar se guarda con `pos`, como en la
// pantalla de siempre. Solo personas: el teléfono de piso cuenta a ciegas (spec 011).
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { nextAfter } from "@/domain/wizards/next";
import { es } from "@/i18n";
import type { CutView } from "@/server/services/cash/cuts";
import { Alert, LinkButton, LoadingState, MoneyField, ResumePrompt, Wizard, formatMoney } from "@/ui";
import { api } from "../../api";
import { useWizardDraft } from "../../wizards/use-wizard-draft";
import { switchView, viewHref } from "../../wizards/view-switch";

const t = es.cash;
const w = t.posWizard;
const STEPS = ["sales"];
const money = (text: string | null | undefined) => (text === null || text === undefined ? "—" : formatMoney(Number(text)));

export function PosReportWizard({ cut, autoResume }: { cut: CutView; autoResume: boolean }) {
  const router = useRouter();
  const initial = { amounts: Object.fromEntries(cut.methods.map((m) => [m.id, m.pos ?? ""])) as Record<string, string> };
  const draft = useWizardDraft({ kind: "cash-pos", target: cut.id, initial, steps: STEPS, autoResume });
  const d = draft.data;
  const [preview, setPreview] = useState<CutView | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const back = `/caja/${cut.id}`;
  const path = (action: string) => `/api/cash/cuts/${cut.id}/${action}`;

  // Al retomar en el resumen, lo que no cuadra se vuelve a pedir al servidor.
  useEffect(() => {
    if (!draft.loaded || draft.prompt || preview || draft.index < 1 || cut.status !== "counted") return;
    void api<{ cut: CutView }>(path("pos-preview"), { body: { amounts: d.amounts } }).then((r) => (r.ok ? setPreview(r.data.cut) : setStepError(r.error.message)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al retomar
  }, [draft.loaded, draft.prompt, draft.index, preview]);

  if (done) {
    const next = nextAfter("cash-pos", { id: cut.id });
    return (
      <div className="flex flex-col gap-4" data-testid="wizard-done">
        <Alert tone="success">{w.done}</Alert>
        <div>
          <LinkButton href={next.href}>{es.common.then[next.key]}</LinkButton>
        </div>
      </div>
    );
  }
  if (cut.status !== "counted")
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="info">{cut.status === "open" ? w.notCounted : t.statusLabels[cut.status]}</Alert>
        <div>
          <LinkButton href={back} variant="secondary">
            {t.back}
          </LinkButton>
        </div>
      </div>
    );
  if (!draft.loaded) return <LoadingState />;
  if (draft.prompt) return <ResumePrompt updatedAt={draft.prompt.updatedAt} stepTitle={w.steps.sales} onContinue={draft.resume} onRestart={() => void draft.restart()} />;

  const go = (i: number) => {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  };

  async function check() {
    const missing = cut.methods.find((m) => !(d.amounts[m.id] ?? "").trim());
    if (missing) return (setStepError(w.required(missing.name)), false);
    const r = await api<{ cut: CutView }>(path("pos-preview"), { body: { amounts: d.amounts } });
    if (!r.ok) return (setStepError(r.error.message), false);
    setStepError(null);
    setPreview(r.data.cut);
    return true;
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    const r = await api(path("pos"), { body: { amounts: d.amounts } });
    setBusy(false);
    if (!r.ok) {
      if (r.error.code === "invalid_amount") {
        go(0);
        setStepError(r.error.message);
      } else setError(r.error.message);
      return;
    }
    await draft.discard();
    setDone(true);
  }

  const off = preview ? preview.methods.filter((m) => m.difference !== null && m.difference !== undefined && Number(m.difference) !== 0) : [];
  const diff = (value: string | null | undefined) => {
    const n = Number(value ?? 0);
    if (n === 0) return <span className="font-semibold text-success">{t.square}</span>;
    return <span className="font-semibold text-danger">{n < 0 ? t.missing(formatMoney(-n)) : t.over(formatMoney(n))}</span>;
  };
  return (
    <Wizard
      dirty={cut.methods.some((m) => (d.amounts[m.id] ?? "") !== (m.pos ?? ""))}
      saved
      index={draft.index}
      onIndexChange={go}
      onExit={() => router.push(back)}
      onFullView={() => void switchView("cash-pos", "full", draft.save).then(() => router.push(viewHref(back, "full", false)))}
      onFinish={() => void confirm()}
      review={{
        confirmLabel: w.confirm,
        busy,
        canConfirm: !!preview,
        extra: !preview ? (
          <LoadingState label={w.loading} />
        ) : (
          <div className="flex flex-col gap-3" data-testid="pos-preview">
            {error ? <Alert tone="error">{error}</Alert> : null}
            <Alert tone={off.length ? "warning" : "success"}>{off.length ? w.notSquare(off.length) : w.allSquare}</Alert>
            <ul className="flex flex-col text-sm">
              {preview.methods.map((m) => (
                <li key={m.id} className="flex flex-wrap justify-between gap-x-3 border-b border-line py-2">
                  <span className="font-semibold">{m.name}</span>
                  <span className="tabular-nums">
                    {t.counted} {money(m.counted)} · {t.reported} {money(m.pos)} · {diff(m.difference)}
                  </span>
                </li>
              ))}
            </ul>
            {preview.figures ? (
              <p className="font-brand text-lg font-bold tabular-nums">
                {t.totalDifference}: {money(preview.figures.totalDifference)}
              </p>
            ) : null}
          </div>
        ),
      }}
      steps={[
        {
          id: "sales",
          title: w.steps.sales,
          hint: w.hint,
          example: cut.methods[0] ? w.example(cut.methods[0].name) : w.exampleGeneric,
          validate: check,
          content: (
            <div className="flex flex-col gap-3">
              {stepError ? <Alert tone="error">{stepError}</Alert> : null}
              {cut.methods.map((m) => (
                <MoneyField key={m.id} label={m.name} value={d.amounts[m.id] ?? ""} onChange={(e) => draft.update((x) => ({ amounts: { ...x.amounts, [m.id]: e.target.value } }))} />
              ))}
            </div>
          ),
          summary: (
            <ul className="flex flex-col text-sm">
              {cut.methods.map((m) => (
                <li key={m.id}>
                  {m.name}: {d.amounts[m.id]?.trim() ? formatMoney(Number(d.amounts[m.id].replace(/,/g, ""))) : "—"}
                </li>
              ))}
            </ul>
          ),
        },
      ]}
    />
  );
}
