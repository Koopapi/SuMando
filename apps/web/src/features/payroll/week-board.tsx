"use client";

// Spec 009: la semana de nómina. El administrador marca días, medias jornadas y retardos; el dueño además ve netos y
// totales al instante, captura montos y abonos, cierra y reabre. Cada cambio vuelve con la semana recalculada por el
// servidor (RF-24); la vista del administrador no trae ningún monto (RF-5).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { PayrollRowView, PayrollWeekView } from "@/server/services/payroll/views";
import { Alert, Button, DayMark, Dialog, EmptyState, LinkButton, MoneyField, PageHeader, SectionLabel, Sheet, StatusBadge, TextArea, TextField, formatDateTime, formatMoney } from "@/ui";
import { api, formValues } from "../api";
import { showDate } from "../personnel/dates";

const t = es.payroll;
const NEXT = { empty: "worked", worked: "half", half: "empty" } as const;

const money = (text: string) => formatMoney(Number(text));

export function WeekBoard({ week: initial }: { week: PayrollWeekView }) {
  const router = useRouter();
  const [week, setWeek] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PayrollRowView | null>(null);
  const [modal, setModal] = useState<"close" | "reopen" | null>(null);
  const [saving, setSaving] = useState(false);
  const open = week.status === "open";
  const base = `/api/payroll/weeks/${week.start}`;

  async function send(path: string, method: string, body: unknown, key: string) {
    setBusy(key);
    setError(null);
    const r = await api<{ week: PayrollWeekView }>(path, { method, body });
    setBusy(null);
    if (!r.ok) {
      setError(r.error.message);
      return false;
    }
    setWeek(r.data.week);
    return true;
  }

  const mark = (row: PayrollRowView, day: number, state: "empty" | "worked" | "half", late: boolean) => send(`${base}/days`, "PUT", { employeeId: row.employeeId, day, state, late }, `${row.employeeId}:${day}`);

  async function saveAmounts(form: HTMLFormElement, row: PayrollRowView) {
    const v = formValues(form);
    setSaving(true);
    const ok = await send(`${base}/lines/${row.employeeId}`, "PATCH", { extras: v.extras, bonus: v.bonus, bonusConcept: v.bonusConcept, meal: v.meal }, "amounts");
    let done = ok;
    for (const l of row.money?.loanLines ?? []) {
      if (!done) break;
      const value = v[`loan-${l.id}`];
      if (value !== undefined && value !== l.payment) done = await send(`${base}/loans/${l.id}`, "PUT", { amount: value }, "amounts");
    }
    setSaving(false);
    if (done) setEditing(null);
  }

  async function act(action: "close" | "reopen", body: unknown) {
    setSaving(true);
    const ok = await send(`${base}/${action}`, "POST", body, action);
    setSaving(false);
    if (ok) {
      setModal(null);
      router.refresh();
    }
  }

  const rows = week.groups.flatMap((g) => g.rows);
  const range = t.weekShort(showDate(week.start), showDate(week.end));
  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={week.owner ? t.intro : t.introAdmin}
        figure={week.totals ? money(week.totals.net) : String(rows.length)}
        figureLabel={week.totals ? t.total : t.people(rows.length)}
        action={
          <span className="flex flex-wrap gap-2">
            {week.owner && open ? (
              <Button onClick={() => (setError(null), setModal("close"))} disabled={!!busy}>
                {t.close}
              </Button>
            ) : null}
            {week.owner && !open ? (
              <Button variant="secondary" onClick={() => (setError(null), setModal("reopen"))}>
                {t.reopen}
              </Button>
            ) : null}
            {week.owner ? (
              <LinkButton href={`/nomina/${week.start}/hoja-de-pago`} variant="secondary">
                {t.paySheet}
              </LinkButton>
            ) : null}
            {week.owner ? (
              <a href={`${base}/excel`} download className="inline-flex min-h-11 items-center justify-center rounded-md border border-line-strong bg-surface px-4 font-brand font-bold text-ink hover:bg-primary-soft">
                {t.excel}
              </a>
            ) : null}
          </span>
        }
      />

      <nav aria-label={t.history} className="flex flex-wrap items-center gap-2">
        <LinkButton href={`/nomina/${week.prev}`} variant="ghost">
          {t.prevWeek}
        </LinkButton>
        <span className="font-semibold">{range}</span>
        <StatusBadge tone={open ? "warning" : "success"}>{open ? t.open : t.closed}</StatusBadge>
        <LinkButton href={`/nomina/${week.next}`} variant="ghost">
          {t.nextWeek}
        </LinkButton>
        <LinkButton href="/nomina" variant="ghost">
          {t.thisWeek}
        </LinkButton>
        <LinkButton href="/nomina/semanas" variant="ghost">
          {t.history}
        </LinkButton>
      </nav>
      {!open && week.closedAt ? <p className="text-sm text-ink-muted">{t.closedOn(formatDateTime(new Date(week.closedAt)))}</p> : null}
      {error && !modal && !editing ? <Alert tone="error">{error}</Alert> : null}

      {week.totals ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm lg:grid-cols-5" data-testid="payroll-totals">
          {(
            [
              [t.subtotalDays, week.totals.days],
              [t.subtotalExtras, week.totals.extrasBonus],
              [t.subtotalLate, week.totals.late],
              [t.subtotalMeal, week.totals.meal],
              [t.subtotalLoans, week.totals.loans],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="font-semibold text-ink-muted">{label}</dt>
              <dd className="font-brand text-lg font-bold tabular-nums">{money(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {open && rows.length ? <p className="text-sm text-ink-muted">{t.dayHint}</p> : null}

      {rows.length === 0 ? (
        <EmptyState title={t.emptyTitle} description={t.emptyDescription} />
      ) : (
        week.groups.map((g) => (
          <section key={g.position} aria-label={g.position} className="flex flex-col">
            <SectionLabel as="h2">{g.position}</SectionLabel>
            <ul className="flex flex-col">
              {g.rows.map((row) => (
                <li key={row.employeeId} className="flex flex-col gap-3 border-b border-line py-3 lg:flex-row lg:items-center lg:gap-6" data-testid="payroll-row">
                  <div className="flex min-w-0 flex-col gap-1 lg:w-56">
                    <span className="font-semibold">{row.name}</span>
                    <span className="text-sm text-ink-muted tabular-nums">{t.counts(row.counts.days, row.counts.half, row.counts.late)}</span>
                    {row.money?.missingPay ? (
                      <span>
                        <StatusBadge tone="danger">{t.noPay}</StatusBadge>
                      </span>
                    ) : null}
                  </div>
                  <div className="flex gap-0.5 sm:gap-1">
                    {row.days.map((d, i) => (
                      <DayMark
                        key={i}
                        day={t.dayShort[i]}
                        state={d.state}
                        late={d.late}
                        editable={d.editable}
                        busy={busy === `${row.employeeId}:${i}`}
                        lateMark={t.lateMark}
                        stateLabel={t.dayButton(row.name, t.dayNames[i], t.states[d.state], d.late)}
                        lateLabel={t.lateButton(row.name, t.dayNames[i], d.late)}
                        onState={() => void mark(row, i, NEXT[d.state], NEXT[d.state] === "empty" ? false : d.late)}
                        onLate={() => void mark(row, i, d.state, !d.late)}
                      />
                    ))}
                  </div>
                  {row.money ? (
                    <div className="flex items-center gap-3 lg:ml-auto">
                      <p className="flex flex-col">
                        <span className="text-xs font-semibold tracking-widest text-ink-muted uppercase">{t.net}</span>
                        <span className={`font-brand text-xl font-bold tabular-nums ${row.money.negative ? "text-danger" : ""}`} data-testid="payroll-net">
                          {money(row.money.net)}
                        </span>
                      </p>
                      {open ? (
                        <Button variant="secondary" aria-label={t.editTitle(row.name)} onClick={() => (setError(null), setEditing(row))}>
                          {t.edit}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <Sheet open={!!editing} label={editing ? t.editTitle(editing.name) : t.edit} onClose={() => setEditing(null)}>
        {editing?.money ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(ev) => {
              ev.preventDefault();
              void saveAmounts(ev.currentTarget, editing);
            }}
          >
            <h2 className="font-brand text-xl font-bold">{t.editTitle(editing.name)}</h2>
            <p className="text-sm text-ink-muted">{t.editIntro}</p>
            {error ? <Alert tone="error">{error}</Alert> : null}
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-ink-muted">{t.pay}</dt>
              <dd className="text-right tabular-nums">{editing.money.pay ? money(editing.money.pay) : t.noPay}</dd>
              <dt className="text-ink-muted">{t.daysAmount}</dt>
              <dd className="text-right tabular-nums">{money(editing.money.days)}</dd>
              <dt className="text-ink-muted">{t.late}</dt>
              <dd className="text-right tabular-nums">{money(editing.money.late)}</dd>
            </dl>
            <MoneyField label={t.extras} name="extras" defaultValue={editing.money.extras === "0.00" ? "" : editing.money.extras} />
            <MoneyField label={t.bonus} name="bonus" defaultValue={editing.money.bonus === "0.00" ? "" : editing.money.bonus} />
            <TextField label={t.bonusConcept} name="bonusConcept" maxLength={80} defaultValue={editing.money.bonusConcept ?? ""} />
            <MoneyField label={t.meal} name="meal" defaultValue={editing.money.meal === "0.00" ? "" : editing.money.meal} />
            {editing.money.loanLines.map((l) => (
              <MoneyField key={l.id} label={t.loanPayment(showDate(l.lentOn), money(l.balance))} name={`loan-${l.id}`} defaultValue={l.payment} />
            ))}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={saving}>
                {t.save}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                {t.cancel}
              </Button>
            </div>
          </form>
        ) : null}
      </Sheet>

      <Dialog open={modal === "close"} title={t.closeTitle} onClose={() => setModal(null)}>
        <div className="flex flex-col gap-4">
          <p>{t.closeIntro}</p>
          {week.totals ? (
            <p className="font-brand text-2xl font-bold tabular-nums">
              {t.total}: {money(week.totals.net)}
            </p>
          ) : null}
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="flex flex-wrap gap-2">
            <Button loading={saving} onClick={() => void act("close", {})}>
              {t.closeConfirm}
            </Button>
            <Button variant="ghost" onClick={() => setModal(null)}>
              {t.cancel}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={modal === "reopen"} title={t.reopenTitle} onClose={() => setModal(null)}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            void act("reopen", { reason: formValues(ev.currentTarget).reason });
          }}
        >
          <p>{t.reopenIntro}</p>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <TextArea label={t.reopenReason} name="reason" maxLength={200} required />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={saving}>
              {t.reopenConfirm}
            </Button>
            <Button variant="ghost" onClick={() => setModal(null)}>
              {t.cancel}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
