"use client";

// Spec 009 RF-27, RF-28, RF-34: préstamos del empleado en su expediente, solo en la vista del dueño.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { LoanView } from "@/server/services/payroll/loans";
import { Alert, Button, Dialog, MoneyField, SectionLabel, StatusBadge, TextField, formatMoney } from "@/ui";
import { api, formValues } from "../api";
import { showDate } from "../personnel/dates";

const t = es.payroll;
const money = (text: string) => formatMoney(Number(text));

export function EmployeeLoans({ employeeId, loans: initial, today }: { employeeId: string; loans: LoanView[]; today: string }) {
  const router = useRouter();
  const [loans, setLoans] = useState(initial);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(form: HTMLFormElement) {
    setBusy(true);
    setError(null);
    const r = await api<{ loans: LoanView[] }>(`/api/employees/${employeeId}/loans`, { method: "POST", body: formValues(form) });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    setLoans(r.data.loans);
    setOpen(false);
    router.refresh();
  }

  return (
    <section aria-label={t.loansTitle} className="flex flex-col gap-2">
      <SectionLabel as="h2">{t.loansTitle}</SectionLabel>
      <p className="text-sm text-ink-muted">{t.loansIntro}</p>
      {loans.length === 0 ? <p className="text-sm">{t.loansEmpty}</p> : null}
      <ul className="flex flex-col" data-testid="employee-loans">
        {loans.map((l) => (
          <li key={l.id} className="flex flex-col gap-1 border-b border-line py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 font-semibold">{t.loanLine(showDate(l.lentOn), money(l.amount), money(l.weekly))}</span>
              {l.settled ? <StatusBadge tone="success">{t.loanSettled}</StatusBadge> : <StatusBadge tone="warning">{t.loanBalance(money(l.balance))}</StatusBadge>}
            </div>
            {l.payments.length ? (
              <ul className="flex flex-col text-sm text-ink-muted tabular-nums">
                {l.payments.map((p) => (
                  <li key={p.week}>{t.loanPaymentLine(showDate(p.week), money(p.amount))}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      <Button variant="secondary" className="self-start" onClick={() => (setError(null), setOpen(true))}>
        {t.loanNew}
      </Button>
      <Dialog open={open} title={t.loanNewTitle} onClose={() => setOpen(false)}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            void create(ev.currentTarget);
          }}
        >
          {error ? <Alert tone="error">{error}</Alert> : null}
          <TextField label={t.loanDate} name="lentOn" type="date" defaultValue={today} required />
          <MoneyField label={t.loanAmount} name="amount" required />
          <MoneyField label={t.loanWeekly} name="weekly" required />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={busy}>
              {t.save}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
