"use client";

// Asistente «Corte» de una persona (spec 015, RF-41): Efectivo por denominación, Terminales y formas de pago, Gastos
// pagados de la caja y Resumen. Nada se registra hasta confirmar: entonces se agregan los gastos nuevos y se entrega el
// conteo, con las rutas de siempre (`movement` y `deliver`). El corte no lleva avisos de dato raro (RF-13).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DENOMINATIONS } from "@/domain/payroll/cash";
import { nextAfter } from "@/domain/wizards/next";
import { es } from "@/i18n";
import type { CutView } from "@/server/services/cash/cuts";
import { Alert, Button, Icon, IconButton, LinkButton, LoadingState, MoneyField, NumberField, ResumePrompt, SectionLabel, TextField, Wizard, formatMoney } from "@/ui";
import { api } from "../../api";
import { useWizardDraft } from "../../wizards/use-wizard-draft";
import { switchView, viewHref } from "../../wizards/view-switch";

const t = es.cash;
const w = t.cutWizard;
const STEPS = ["cash", "methods", "expenses"];
const pesos = (cents: bigint) => formatMoney(Number(cents) / 100);
const money = (text: string) => formatMoney(Number(text.replace(/,/g, "")));

interface Expense {
  key: number;
  concept: string;
  amount: string;
}

interface CutDraft {
  pieces: Record<string, number>;
  amounts: Record<string, string>;
  expenses: Expense[];
}

export function CutWizard({ cut, autoResume }: { cut: CutView; autoResume: boolean }) {
  const router = useRouter();
  const others = cut.methods.filter((m) => !m.isCash);
  const initial: CutDraft = { pieces: cut.pieces ?? {}, amounts: Object.fromEntries(others.map((m) => [m.id, m.counted ?? ""])), expenses: [] };
  const draft = useWizardDraft<CutDraft>({ kind: "cash-cut", target: cut.id, initial, steps: STEPS, autoResume });
  const d = draft.data;
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const back = `/caja/${cut.id}`;

  if (done) {
    const next = nextAfter("cash-cut", { id: cut.id });
    return (
      <div className="flex flex-col gap-4" data-testid="wizard-done">
        <Alert tone="success">{w.done}</Alert>
        <div>
          <LinkButton href={next.href}>{es.common.then[next.key]}</LinkButton>
        </div>
      </div>
    );
  }
  if (cut.status !== "open")
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="info">{w.notOpen}</Alert>
        <div>
          <LinkButton href={back} variant="secondary">
            {t.back}
          </LinkButton>
        </div>
      </div>
    );
  if (!draft.loaded) return <LoadingState />;
  if (draft.prompt) return <ResumePrompt updatedAt={draft.prompt.updatedAt} stepTitle={w.steps[draft.prompt.step as keyof typeof w.steps] ?? w.steps.cash} onContinue={draft.resume} onRestart={() => void draft.restart()} />;

  const set = (patch: Partial<CutDraft>) => draft.update((x) => ({ ...x, ...patch }));
  const setCount = (key: string, n: number) => set({ pieces: { ...d.pieces, [key]: Math.max(0, Math.floor(Number.isFinite(n) ? n : 0)) } });
  const setExpense = (key: number, patch: Partial<Expense>) => set({ expenses: d.expenses.map((e) => (e.key === key ? { ...e, ...patch } : e)) });
  const pieceCount = Object.values(d.pieces).reduce((a, n) => a + (n || 0), 0);
  // Lo mismo que muestra la pantalla de siempre mientras se cuenta: la suma de lo que se lleva contado.
  const total = DENOMINATIONS.reduce((a, x) => a + x.cents * BigInt(d.pieces[x.cents.toString()] ?? 0), 0n);
  const expenses = cut.movements.filter((m) => m.kind === "expense" && !m.cancelled);
  const fresh = d.expenses.filter((e) => e.concept.trim() || e.amount.trim());
  const go = (i: number) => {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  };
  const fail = (message: string) => (setStepError(message), false);

  async function confirm() {
    setBusy(true);
    setError(null);
    const base = `/api/cash/cuts/${cut.id}`;
    for (const [i, e] of fresh.entries()) {
      const r = await api(`${base}/movement`, { body: { kind: "expense", concept: e.concept.trim(), amount: e.amount.trim() } });
      if (!r.ok) {
        setBusy(false);
        // RF-10: el gasto que falló vuelve a su paso; los anteriores ya quedaron registrados y se quitan de la lista.
        set({ expenses: d.expenses.filter((x) => !fresh.slice(0, i).includes(x)) });
        go(2);
        setStepError(r.error.message);
        return;
      }
    }
    if (fresh.length) set({ expenses: [] });
    const r = await api(`${base}/deliver`, { body: { pieces: d.pieces, amounts: d.amounts } });
    setBusy(false);
    if (!r.ok) {
      if (r.error.code === "invalid_cash_pieces") go(0);
      else if (r.error.code === "invalid_amount" || r.error.code === "cut_incomplete") go(1);
      else return setError(r.error.message);
      setStepError(r.error.message);
      return;
    }
    await draft.discard();
    setDone(true);
  }

  const errorBox = stepError ? <Alert tone="error">{stepError}</Alert> : null;
  return (
    <Wizard
      dirty={pieceCount > 0 || fresh.length > 0}
      saved
      index={draft.index}
      onIndexChange={go}
      onExit={() => router.push(back)}
      onFullView={() => void switchView("cash-cut", "full", draft.save).then(() => router.push(viewHref(back, "full", false)))}
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
              <ul className="flex flex-col">
                {DENOMINATIONS.map((x) => {
                  const key = x.cents.toString();
                  const label = t.denomination(pesos(x.cents), x.kind);
                  const n = d.pieces[key] ?? 0;
                  return (
                    <li key={key} className="flex items-end gap-2 border-b border-line py-2">
                      <NumberField label={label} value={n ? String(n) : ""} onChange={(e) => setCount(key, Number(e.target.value))} className="min-w-0 flex-1" />
                      <IconButton label={t.less(label)} onClick={() => setCount(key, n - 1)}>
                        <Icon name="minus" />
                      </IconButton>
                      <IconButton label={t.more(label)} onClick={() => setCount(key, n + 1)}>
                        <Icon name="plus" />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
              <p className="font-brand text-xl font-bold tabular-nums" data-testid="cash-counted-total">
                {t.cashCounted}: {pesos(total)}
              </p>
            </div>
          ),
          summary: `${pesos(total)} · ${w.piecesLine(pieceCount)}`,
        },
        {
          id: "methods",
          title: w.steps.methods,
          hint: w.hints.methods,
          example: others[0] ? w.examples.methods(others[0].name) : w.methodsGeneric,
          validate: () => {
            const missing = others.find((m) => !(d.amounts[m.id] ?? "").trim());
            return missing ? fail(w.methodRequired(missing.name)) : (setStepError(null), true);
          },
          content: (
            <div className="flex flex-col gap-3">
              {errorBox}
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
            "—"
          ),
        },
        {
          id: "expenses",
          title: w.steps.expenses,
          hint: w.hints.expenses,
          example: w.examples.expenses,
          validate: () => {
            const bad = d.expenses.findIndex((e) => (e.concept.trim() || e.amount.trim()) && !(e.concept.trim() && e.amount.trim()));
            return bad >= 0 ? fail(w.fillExpense(bad + 1)) : (setStepError(null), true);
          },
          content: (
            <div className="flex flex-col gap-4">
              {errorBox}
              <section aria-label={w.already} className="flex flex-col gap-1">
                <SectionLabel as="h3">{w.already}</SectionLabel>
                {expenses.length === 0 ? <p className="text-sm text-ink-muted">{w.noExpenses}</p> : null}
                <ul className="flex flex-col text-sm">
                  {expenses.map((m) => (
                    <li key={m.id} className="flex justify-between gap-3 border-b border-line py-2">
                      <span className="min-w-0 break-words">{m.concept}</span>
                      <span className="shrink-0 tabular-nums">{money(m.amount)}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section aria-label={w.newExpenses} className="flex flex-col gap-2">
                <SectionLabel as="h3">{w.newExpenses}</SectionLabel>
                {d.expenses.map((e, i) => (
                  <div key={e.key} className="flex flex-wrap items-end gap-2 border-b border-line pb-3" data-testid="new-expense">
                    <TextField label={w.expenseConcept(i + 1)} maxLength={80} className="min-w-0 flex-1 basis-48" value={e.concept} onChange={(ev) => setExpense(e.key, { concept: ev.target.value })} />
                    <MoneyField label={w.expenseAmount(i + 1)} className="w-36" value={e.amount} onChange={(ev) => setExpense(e.key, { amount: ev.target.value })} />
                    <IconButton label={w.removeExpense(e.concept)} onClick={() => set({ expenses: d.expenses.filter((x) => x.key !== e.key) })}>
                      <Icon name="close" />
                    </IconButton>
                  </div>
                ))}
                <Button variant="secondary" className="self-start" onClick={() => set({ expenses: [...d.expenses, { key: Math.max(0, ...d.expenses.map((x) => x.key)) + 1, concept: "", amount: "" }] })}>
                  {w.addExpense}
                </Button>
              </section>
            </div>
          ),
          summary: (
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">{w.expensesLine(fresh.length)}</span>
              {fresh.map((e) => (
                <span key={e.key}>
                  {e.concept.trim()} · {e.amount.trim() ? money(e.amount) : "—"}
                </span>
              ))}
            </div>
          ),
        },
      ]}
    />
  );
}
