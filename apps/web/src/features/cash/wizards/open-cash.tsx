"use client";

// Asistente «Abrir caja» (spec 015, RF-40): Fondo y Resumen. Abre con `/api/cash/cuts`, como la pantalla de siempre.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { nextAfter } from "@/domain/wizards/next";
import { parseMoney } from "@/domain/requisitions/money";
import { es } from "@/i18n";
import { Alert, LinkButton, LoadingState, MoneyField, ResumePrompt, Wizard, formatMoney } from "@/ui";
import { api } from "../../api";
import { useWizardDraft } from "../../wizards/use-wizard-draft";
import { switchView, viewHref } from "../../wizards/view-switch";

const t = es.cash;
const w = t.openWizard;
const STEPS = ["fund"];

export function OpenCashWizard({ autoResume }: { autoResume: boolean }) {
  const router = useRouter();
  const draft = useWizardDraft<{ fund: string }>({ kind: "cash-open", initial: { fund: "" }, steps: STEPS, autoResume });
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const fund = draft.data.fund;

  if (done) {
    const next = nextAfter("cash-open", { id: "" });
    return (
      <div className="flex flex-col gap-4" data-testid="wizard-done">
        <Alert tone="success">{w.done}</Alert>
        <div>
          <LinkButton href={next.href}>{es.common.then[next.key]}</LinkButton>
        </div>
      </div>
    );
  }
  if (!draft.loaded) return <LoadingState />;
  if (draft.prompt) return <ResumePrompt updatedAt={draft.prompt.updatedAt} stepTitle={w.steps.fund} onContinue={draft.resume} onRestart={() => void draft.restart()} />;

  const go = (i: number) => {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  };

  async function confirm() {
    setBusy(true);
    setError(null);
    const r = await api("/api/cash/cuts", { body: { fund } });
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

  // Solo para saber si el campo tiene un monto válido; el servidor vuelve a validarlo al abrir.
  const valid = parseMoney(fund) !== undefined && parseMoney(fund) !== null;
  return (
    <Wizard
      dirty={fund.trim() !== ""}
      saved
      index={draft.index}
      onIndexChange={go}
      onExit={() => router.push("/")}
      onFullView={() => void switchView("cash-open", "full", draft.save).then(() => router.push(viewHref("/caja", "full", false)))}
      onFinish={() => void confirm()}
      review={{ confirmLabel: w.confirm, busy, extra: error ? <Alert tone="error">{error}</Alert> : null }}
      steps={[
        {
          id: "fund",
          title: w.steps.fund,
          hint: w.hint,
          example: w.example,
          validate: () => (valid ? (setStepError(null), true) : (setStepError(es.errors.invalid_amount), false)),
          content: (
            <div className="flex flex-col gap-3">
              {stepError ? <Alert tone="error">{stepError}</Alert> : null}
              <MoneyField label={t.fund} value={fund} onChange={(e) => draft.update(() => ({ fund: e.target.value }))} />
            </div>
          ),
          summary: valid ? formatMoney(Number(fund.replace(/,/g, ""))) : "",
        },
      ]}
    />
  );
}
