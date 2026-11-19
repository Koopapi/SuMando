"use client";

// Asistente «Cerrar la semana» (spec 015, RF-39 y RF-13), solo del dueño: Extras, bonos y comida (aviso si un extra
// o un bono pasa del sueldo de la semana); Préstamos; Revisión por persona y Resumen con los billetes de cada sobre.
// Los netos y los billetes los calcula el servidor (`preview`, sin guardar). Al confirmar se guardan los montos y los
// abonos con las rutas de siempre y se cierra la semana.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { nextAfter } from "@/domain/wizards/next";
import { unusual } from "@/domain/wizards/unusual";
import { es } from "@/i18n";
import type { ClosePreviewView, PayrollRowView, PayrollWeekView } from "@/server/services/payroll/views";
import { Alert, LinkButton, LoadingState, MoneyField, ResumePrompt, SectionLabel, TextField, UnusualMark, UnusualNotice, Wizard, formatMoney } from "@/ui";
import { api } from "../../api";
import { showDate } from "../../personnel/dates";
import { useWizardDraft } from "../../wizards/use-wizard-draft";
import { switchView, viewHref } from "../../wizards/view-switch";
import { Cash } from "../pay-sheet";

const t = es.payroll;
const w = t.closeWizard;
const STEPS = ["amounts", "loans", "review"];

type Amounts = { extras: string; bonus: string; bonusConcept: string; meal: string };

interface CloseDraft {
  amounts: Record<string, Amounts>;
  loans: Record<string, string>;
  confirmed: string[];
}

const money = (text: string) => formatMoney(Number(text));
const blank = (v: string) => (v === "0.00" ? "" : v);
/** Para comparar contra el sueldo, sin las comas de miles que acepta el servidor. */
const plain = (v: string) => v.replace(/,/g, "").trim();

export function CloseWeekWizard({ week, autoResume }: { week: PayrollWeekView; autoResume: boolean }) {
  const router = useRouter();
  const rows = week.groups.flatMap((g) => g.rows).filter((r) => r.money);
  const draft = useWizardDraft<CloseDraft>({ kind: "pay-close", target: week.start, initial: { amounts: {}, loans: {}, confirmed: [] }, steps: STEPS, autoResume });
  const d = draft.data;
  const [preview, setPreview] = useState<ClosePreviewView | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const weekHref = viewHref(`/nomina/${week.start}`, "full", false);

  const original = (r: PayrollRowView): Amounts => ({ extras: blank(r.money!.extras), bonus: blank(r.money!.bonus), bonusConcept: r.money!.bonusConcept ?? "", meal: blank(r.money!.meal) });
  const amountsOf = (r: PayrollRowView) => d.amounts[r.employeeId] ?? original(r);
  const setAmounts = (r: PayrollRowView, patch: Partial<Amounts>) => draft.update((x) => ({ ...x, amounts: { ...x.amounts, [r.employeeId]: { ...amountsOf(r), ...patch } } }));
  const loanLines = rows.flatMap((r) => r.money!.loanLines.map((l) => ({ row: r, loan: l })));
  const paymentOf = (id: string, current: string) => d.loans[id] ?? current;
  const body = () => ({
    lines: Object.fromEntries(Object.entries(d.amounts).map(([id, a]) => [id, { extras: a.extras, bonus: a.bonus, bonusConcept: a.bonusConcept, meal: a.meal }])),
    loans: d.loans,
  });
  const changedAmounts = rows.filter((r) => d.amounts[r.employeeId] && JSON.stringify(amountsOf(r)) !== JSON.stringify(original(r)));
  const withAmounts = rows.filter((r) => ["extras", "bonus", "meal"].some((k) => amountsOf(r)[k as keyof Amounts].trim()));
  const changedLoans = loanLines.filter((x) => d.loans[x.loan.id] !== undefined && d.loans[x.loan.id] !== x.loan.payment);

  // RF-13: un extra o un bono mayor que el sueldo de la semana (sin sueldo, no hay con qué comparar: RF-15).
  const odd = (r: PayrollRowView, field: "extras" | "bonus") => {
    const v = plain(amountsOf(r)[field]);
    return v ? unusual("pay", v, r.money!.pay === null ? null : r.money!.days) : { unusual: false, expected: null };
  };
  const key = (r: PayrollRowView, field: "extras" | "bonus") => `${r.employeeId}|${field}|${plain(amountsOf(r)[field])}`;
  const pending = rows.flatMap((r) => (["extras", "bonus"] as const).filter((f) => odd(r, f).unusual && !d.confirmed.includes(key(r, f))));

  // Al retomar en la revisión o el resumen, la vista previa se vuelve a pedir al servidor.
  useEffect(() => {
    if (!draft.loaded || draft.prompt || preview || draft.index < 2 || !week.owner || week.status !== "open") return;
    void api<{ preview: ClosePreviewView }>(`/api/payroll/weeks/${week.start}/preview`, { body: body() }).then((r) => (r.ok ? setPreview(r.data.preview) : setStepError(r.error.message)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al retomar
  }, [draft.loaded, draft.prompt, draft.index, preview]);

  if (done) {
    const next = nextAfter("pay-close", { id: week.start });
    return (
      <div className="flex flex-col gap-4" data-testid="wizard-done">
        <Alert tone="success">{w.done}</Alert>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={next.href}>{es.common.then[next.key]}</LinkButton>
          <LinkButton href={weekHref} variant="secondary">
            {t.attendanceWizard.back}
          </LinkButton>
        </div>
      </div>
    );
  }
  if (!week.owner || week.status !== "open")
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="info">{week.owner ? w.closed : es.errors.owner_only}</Alert>
        <div>
          <LinkButton href={weekHref} variant="secondary">
            {t.attendanceWizard.back}
          </LinkButton>
        </div>
      </div>
    );
  if (!draft.loaded) return <LoadingState />;
  if (draft.prompt) return <ResumePrompt updatedAt={draft.prompt.updatedAt} stepTitle={w.steps[draft.prompt.step as keyof typeof w.steps] ?? w.steps.amounts} onContinue={draft.resume} onRestart={() => void draft.restart()} />;

  const go = (i: number) => {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  };

  async function loadPreview() {
    const r = await api<{ preview: ClosePreviewView }>(`/api/payroll/weeks/${week.start}/preview`, { body: body() });
    if (!r.ok) {
      // RF-10: un monto inválido regresa a los montos.
      if (r.error.code === "invalid_amount" || r.error.code === "validation") go(0);
      setStepError(r.error.message);
      return false;
    }
    setPreview(r.data.preview);
    return true;
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    const base = `/api/payroll/weeks/${week.start}`;
    for (const r of changedAmounts) {
      const a = amountsOf(r);
      const res = await api(`${base}/lines/${r.employeeId}`, { method: "PATCH", body: { extras: a.extras, bonus: a.bonus, bonusConcept: a.bonusConcept, meal: a.meal } });
      if (!res.ok) return (setBusy(false), go(0), setStepError(res.error.message));
    }
    for (const x of changedLoans) {
      const res = await api(`${base}/loans/${x.loan.id}`, { method: "PUT", body: { amount: d.loans[x.loan.id] } });
      if (!res.ok) return (setBusy(false), go(1), setStepError(res.error.message));
    }
    const closed = await api(`${base}/close`, { method: "POST", body: {} });
    setBusy(false);
    if (!closed.ok) return setError(closed.error.message);
    await draft.discard();
    setDone(true);
  }

  const previewRows = preview ? preview.week.groups.flatMap((g) => g.rows) : [];
  const errorBox = stepError ? <Alert tone="error">{stepError}</Alert> : null;
  return (
    <Wizard
      dirty={changedAmounts.length > 0 || changedLoans.length > 0}
      saved
      index={draft.index}
      onIndexChange={go}
      onExit={() => router.push(weekHref)}
      onFullView={() => void switchView("pay-close", "full", draft.save).then(() => router.push(weekHref))}
      onFinish={() => void confirm()}
      review={{
        confirmLabel: w.confirm,
        busy,
        canConfirm: !!preview && preview.problems.length === 0,
        extra: preview ? (
          <div className="flex flex-col gap-4">
            {preview.problems.map((p) => (
              <Alert key={p} tone="error">
                {p}
              </Alert>
            ))}
            {error ? <Alert tone="error">{error}</Alert> : null}
            <section aria-label={w.envelopes} className="flex flex-col gap-2" data-testid="close-envelopes">
              <SectionLabel as="h3">{w.envelopes}</SectionLabel>
              {previewRows.map((r) => (
                <div key={r.employeeId} className="flex flex-col gap-1 border-b border-line py-2">
                  <span className="flex justify-between gap-3 font-semibold">
                    <span className="min-w-0 break-words">{r.name}</span>
                    <span className="tabular-nums">{money(r.money!.net)}</span>
                  </span>
                  <Cash cash={preview.cash[r.employeeId]} testId="close-envelope" />
                </div>
              ))}
              <span className="flex justify-between gap-3 pt-1 font-brand text-lg font-bold">
                <span>{t.paySheetCash}</span>
                <span className="tabular-nums">{money(preview.week.totals!.net)}</span>
              </span>
              <Cash cash={preview.totalCash} testId="close-total-cash" />
            </section>
          </div>
        ) : (
          <LoadingState label={w.loading} />
        ),
      }}
      steps={[
        {
          id: "amounts",
          title: w.steps.amounts,
          hint: w.hints.amounts,
          example: rows[0] ? w.examples.amounts(rows[0].name) : w.examplesGeneric.amounts,
          validate: () => (pending.length ? (setStepError(w.pendingUnusual), false) : (setStepError(null), true)),
          content: (
            <div className="flex flex-col gap-4">
              {errorBox}
              {rows.map((r) => {
                const a = amountsOf(r);
                const notice = (field: "extras" | "bonus") => {
                  const o = odd(r, field);
                  if (!o.unusual || !o.expected) return null;
                  return <UnusualNotice what={field === "extras" ? w.whatExtras(r.name) : w.whatBonus(r.name)} expected={w.expectedPay(money(o.expected))} confirmed={d.confirmed.includes(key(r, field))} onConfirm={() => draft.update((x) => ({ ...x, confirmed: [...x.confirmed, key(r, field)] }))} />;
                };
                return (
                  <fieldset key={r.employeeId} className="flex min-w-0 flex-col gap-3 border-t border-line pt-3" data-testid="close-amounts">
                    <legend className="flex w-full flex-wrap justify-between gap-x-3 font-semibold">
                      <span className="break-words">{r.name}</span>
                      <span className="text-sm font-normal text-ink-muted">{r.money!.pay ? `${t.pay}: ${money(r.money!.pay)}` : t.noPay}</span>
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MoneyField label={`${t.extras} · ${r.name}`} value={a.extras} onChange={(e) => setAmounts(r, { extras: e.target.value })} />
                      <MoneyField label={`${t.meal} · ${r.name}`} value={a.meal} onChange={(e) => setAmounts(r, { meal: e.target.value })} />
                    </div>
                    {notice("extras")}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MoneyField label={`${t.bonus} · ${r.name}`} value={a.bonus} onChange={(e) => setAmounts(r, { bonus: e.target.value })} />
                      <TextField label={`${t.bonusConcept} · ${r.name}`} maxLength={80} value={a.bonusConcept} onChange={(e) => setAmounts(r, { bonusConcept: e.target.value })} />
                    </div>
                    {notice("bonus")}
                  </fieldset>
                );
              })}
            </div>
          ),
          summary: (
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">{w.changes(withAmounts.length)}</span>
              {withAmounts.map((r) => {
                const a = amountsOf(r);
                const parts = [a.extras.trim() && `${t.extras} ${money(plain(a.extras))}`, a.bonus.trim() && `${t.bonus} ${money(plain(a.bonus))}${a.bonusConcept.trim() ? ` (${a.bonusConcept.trim()})` : ""}`, a.meal.trim() && `${t.meal} ${money(plain(a.meal))}`].filter(Boolean).join(" · ");
                return (
                  <span key={r.employeeId} className="flex flex-wrap items-center gap-x-2">
                    {w.amountsLine(r.name, parts)}
                    {odd(r, "extras").unusual || odd(r, "bonus").unusual ? <UnusualMark /> : null}
                  </span>
                );
              })}
            </div>
          ),
        },
        {
          id: "loans",
          title: w.steps.loans,
          hint: w.hints.loans,
          example: w.examples.loans,
          validate: loadPreview,
          content: (
            <div className="flex flex-col gap-3">
              {errorBox}
              {loanLines.length === 0 ? <p className="text-sm text-ink-muted">{w.noLoans}</p> : null}
              {loanLines.map(({ row, loan }) => (
                <MoneyField key={loan.id} label={`${row.name} · ${t.loanPayment(showDate(loan.lentOn), money(loan.balance))}`} value={paymentOf(loan.id, loan.payment)} onChange={(e) => draft.update((x) => ({ ...x, loans: { ...x.loans, [loan.id]: e.target.value } }))} />
              ))}
            </div>
          ),
          summary: w.loansLine(loanLines.filter((x) => Number(plain(paymentOf(x.loan.id, x.loan.payment)) || 0) > 0).length),
        },
        {
          id: "review",
          title: w.steps.review,
          hint: w.hints.review,
          content: !preview ? (
            <LoadingState label={w.loading} />
          ) : (
            <div className="flex flex-col gap-3">
              {errorBox}
              <ul className="flex flex-col">
                {previewRows.map((r) => (
                  <li key={r.employeeId} className="flex flex-col gap-1 border-t border-line py-3" data-testid="close-review-row">
                    <span className="flex justify-between gap-3">
                      <span className="min-w-0 font-semibold break-words">{r.name}</span>
                      <span className={`font-brand text-lg font-bold tabular-nums ${r.money!.negative ? "text-danger" : ""}`}>{money(r.money!.net)}</span>
                    </span>
                    <span className="text-sm text-ink-muted tabular-nums">
                      {t.daysAmount} {money(r.money!.days)} · {t.extras} {money(r.money!.extras)} · {t.bonus} {money(r.money!.bonus)} · {t.late} −{money(r.money!.late)} · {t.meal} −{money(r.money!.meal)} · {t.loans} −{money(r.money!.loans)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ),
          summary: preview ? `${t.total}: ${money(preview.week.totals!.net)}` : "",
        },
      ]}
    />
  );
}
