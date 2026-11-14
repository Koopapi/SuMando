"use client";

// Spec 011: el corte de caja. Lo usan las personas (`/caja`, `/caja/[id]`) y el teléfono de piso (`/piso/caja`); la
// vista del teléfono llega ciega del servidor (sin reporte, esperado ni diferencias). Cada acción vuelve con el corte.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DENOMINATIONS } from "@/domain/payroll/cash";
import { es } from "@/i18n";
import type { CutView } from "@/server/services/cash/cuts";
import { Alert, Button, Dialog, EmptyState, IconButton, Icon, MoneyField, NumberField, SectionLabel, SelectField, StatusBadge, TextArea, TextField, Wizard, formatDateTime, formatMoney, useToast } from "@/ui";
import { api, formValues } from "../api";
import { showDate } from "../personnel/dates";

const t = es.cash;
const money = (text: string | null | undefined) => (text === null || text === undefined ? "—" : formatMoney(Number(text)));
const at = (iso: string) => formatDateTime(new Date(iso));
const pesos = (cents: bigint) => formatMoney(Number(cents) / 100);

export function CutBoard({ cut: initial, mode, employeeId, canOpen = true }: { cut: CutView | null; mode: "user" | "device"; employeeId?: string; canOpen?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [cut, setCut] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [counting, setCounting] = useState(false);
  const [modal, setModal] = useState<{ kind: "cancel"; id: string; concept: string } | { kind: "close" | "reopen" } | null>(null);

  async function call(path: string, body: Record<string, unknown>, done?: () => void) {
    setBusy(true);
    setError(null);
    const r = await api<{ cut: CutView }>(path, { body: { ...body, employeeId } });
    setBusy(false);
    if (!r.ok) {
      setError(r.error.message);
      return false;
    }
    setCut(r.data.cut);
    done?.();
    return true;
  }
  const act = (action: string, body: Record<string, unknown>, done?: () => void) => call(`/api/cash/cuts/${cut!.id}/${action}`, body, done);

  if (!cut) {
    return (
      <div className="flex flex-col gap-4">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <EmptyState title={t.none} description={t.noneDescription} />
        {canOpen ? (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void call("/api/cash/cuts", { fund: formValues(e.currentTarget).fund }, () => router.refresh());
            }}
          >
            <MoneyField label={t.fund} name="fund" required className="min-w-0 flex-1 lg:max-w-xs" />
            <Button type="submit" loading={busy}>
              {t.open}
            </Button>
          </form>
        ) : null}
      </div>
    );
  }

  const open = cut.status === "open";
  const person = mode === "user";
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={cut.status === "closed" ? "success" : "warning"}>{t.statusLabels[cut.status]}</StatusBadge>
        <span className="text-sm text-ink-muted">{t.openedLine(showDate(cut.date), at(cut.openedAt), cut.openedBy)}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm lg:grid-cols-4">
        {(
          [
            [t.fund, cut.fund],
            [t.expenses, cut.totals.expenses],
            [t.withdrawals, cut.totals.withdrawals],
            [t.incomes, cut.totals.incomes],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="font-semibold text-ink-muted">{label}</dt>
            <dd className="font-brand text-lg font-bold tabular-nums">{money(value)}</dd>
          </div>
        ))}
      </dl>
      {error && !modal && !counting ? <Alert tone="error">{error}</Alert> : null}

      <section aria-label={t.movements} className="flex flex-col gap-3">
        <SectionLabel as="h2">{t.movements}</SectionLabel>
        {cut.movements.length === 0 ? <p className="text-sm">{t.movementsEmpty}</p> : null}
        <ul className="flex flex-col" data-testid="cash-movements">
          {cut.movements.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 border-b border-line py-2">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={`font-semibold ${m.cancelled ? "text-ink-muted line-through" : ""}`}>{m.concept}</span>
                <span className="text-sm text-ink-muted">{m.cancelled ? t.cancelled(m.cancelReason ?? "") : t.movementLine(t.kinds[m.kind], m.by, at(m.at))}</span>
              </span>
              <span className="font-brand font-bold tabular-nums">{money(m.amount)}</span>
              {open && !m.cancelled ? (
                <Button variant="ghost" aria-label={t.cancelFor(m.concept)} onClick={() => (setError(null), setModal({ kind: "cancel", id: m.id, concept: m.concept }))}>
                  {t.cancel}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {open ? (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              void act("movement", formValues(form), () => {
                form.reset();
                toast.success(t.saved);
              });
            }}
          >
            <SelectField label={t.kind} name="kind" defaultValue="expense" options={(["expense", "withdrawal", "income"] as const).map((k) => ({ value: k, label: t.kinds[k] }))} />
            <TextField label={t.concept} name="concept" maxLength={80} required className="min-w-0 flex-1" />
            <MoneyField label={t.amount} name="amount" required className="lg:max-w-48" />
            <Button type="submit" variant="secondary" loading={busy}>
              {t.addMovement}
            </Button>
            <p className="w-full text-sm text-ink-muted">{t.kindHint}</p>
          </form>
        ) : null}
      </section>

      {open && !counting ? (
        <Button className="self-start" onClick={() => (setError(null), setCounting(true))}>
          {t.count}
        </Button>
      ) : null}
      {open && counting ? <CountWizard cut={cut} busy={busy} error={error} onExit={() => setCounting(false)} onDeliver={(body) => act("deliver", body, () => setCounting(false))} /> : null}

      {cut.status !== "open" ? (
        <section aria-label={t.countTitle} className="flex flex-col gap-2">
          <SectionLabel as="h2">{t.countTitle}</SectionLabel>
          {cut.countedBy && cut.countedAt ? <p className="text-sm text-ink-muted">{t.countedLine(cut.countedBy, at(cut.countedAt))}</p> : null}
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums" data-testid="cash-pieces">
            {DENOMINATIONS.filter((d) => cut.pieces?.[d.cents.toString()]).map((d) => (
              <li key={d.cents.toString()}>
                {t.denomination(pesos(d.cents), d.kind)} {t.pieces(cut.pieces![d.cents.toString()])}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {person && cut.status !== "open" ? <Summary cut={cut} /> : null}

      {person && cut.status === "counted" ? (
        <section aria-label={t.pos} className="flex flex-col gap-3">
          <SectionLabel as="h2">{t.pos}</SectionLabel>
          <p className="text-sm text-ink-muted">{t.posIntro}</p>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void act("pos", { amounts: formValues(e.currentTarget) }, () => toast.success(t.saved));
            }}
          >
            <div className="grid gap-3 lg:grid-cols-3">
              {cut.methods.map((m) => (
                <MoneyField key={m.id} label={m.name} name={m.id} defaultValue={m.pos ?? ""} required />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="secondary" loading={busy}>
                {t.savePos}
              </Button>
              {cut.posCaptured ? <Button onClick={() => (setError(null), setModal({ kind: "close" }))}>{t.close}</Button> : null}
            </div>
          </form>
        </section>
      ) : null}

      {cut.status === "closed" ? (
        <div className="flex flex-col gap-2">
          {cut.closedAt && cut.closedBy ? <p className="text-sm text-ink-muted">{t.closedLine(at(cut.closedAt), cut.closedBy)}</p> : null}
          {cut.note ? <p className="whitespace-pre-line">{cut.note}</p> : null}
          {cut.canReopen ? (
            <Button variant="secondary" className="self-start" onClick={() => (setError(null), setModal({ kind: "reopen" }))}>
              {t.reopen}
            </Button>
          ) : null}
        </div>
      ) : null}

      <Dialog open={modal?.kind === "cancel"} title={t.cancelTitle} onClose={() => setModal(null)}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (modal?.kind === "cancel") void act("cancel-movement", { movementId: modal.id, reason: formValues(e.currentTarget).reason }, () => setModal(null));
          }}
        >
          {modal?.kind === "cancel" ? <p className="font-semibold">{modal.concept}</p> : null}
          {error ? <Alert tone="error">{error}</Alert> : null}
          <TextArea label={t.cancelReason} name="reason" rows={2} maxLength={200} required />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={busy}>
              {t.cancelConfirm}
            </Button>
            <Button variant="ghost" onClick={() => setModal(null)}>
              {t.back}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={modal?.kind === "close"} title={t.closeTitle} onClose={() => setModal(null)}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void act("close", { note: formValues(e.currentTarget).note }, () => {
              setModal(null);
              router.refresh();
            });
          }}
        >
          <p>{t.closeIntro}</p>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <TextArea label={t.note} name="note" rows={3} maxLength={300} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={busy}>
              {t.close}
            </Button>
            <Button variant="ghost" onClick={() => setModal(null)}>
              {t.back}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={modal?.kind === "reopen"} title={t.reopenTitle} onClose={() => setModal(null)}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void act("reopen", { reason: formValues(e.currentTarget).reason }, () => {
              setModal(null);
              router.refresh();
            });
          }}
        >
          <p>{t.reopenIntro}</p>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <TextArea label={t.reopenReason} name="reason" rows={2} maxLength={200} required />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={busy}>
              {t.reopenConfirm}
            </Button>
            <Button variant="ghost" onClick={() => setModal(null)}>
              {t.back}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

/** RF-25 a RF-29: contado, punto de venta y diferencia por forma de pago; en rojo lo que no cuadra. */
function Summary({ cut }: { cut: CutView }) {
  const diff = (d: string | null | undefined) => {
    if (d === null || d === undefined) return <span className="text-ink-muted">—</span>;
    const n = Number(d);
    if (n === 0) return <span className="font-semibold text-success">{t.square}</span>;
    return <span className="font-semibold text-danger">{n < 0 ? t.missing(formatMoney(-n)) : t.over(formatMoney(n))}</span>;
  };
  return (
    <section aria-label={t.summary} className="flex flex-col gap-3">
      <SectionLabel as="h2">{t.summary}</SectionLabel>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm tabular-nums" data-testid="cash-summary">
          <thead>
            <tr className="border-b border-line-strong">
              <th scope="col" className="py-2 pr-4 font-semibold">
                {t.method}
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-semibold">
                {t.counted}
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-semibold">
                {t.reported}
              </th>
              <th scope="col" className="py-2 text-right font-semibold">
                {t.difference}
              </th>
            </tr>
          </thead>
          <tbody>
            {cut.methods.map((m) => (
              <tr key={m.id} className="border-b border-line">
                <th scope="row" className="py-2 pr-4 font-semibold">
                  {m.name}
                </th>
                <td className="py-2 pr-4 text-right">{money(m.counted)}</td>
                <td className="py-2 pr-4 text-right">{money(m.pos)}</td>
                <td className="py-2 text-right">{diff(m.difference)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cut.figures ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm lg:grid-cols-3" data-testid="cash-figures">
          {(
            [
              [t.expected, cut.figures.cashExpected],
              [t.posTotal, cut.figures.posTotal],
              [t.salesBefore, cut.figures.salesBefore],
              [t.salesAfter, cut.figures.salesAfter],
              [t.expenses, cut.figures.expenses],
              [t.totalDifference, cut.figures.totalDifference],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="font-semibold text-ink-muted">{label}</dt>
              <dd className={`font-brand text-lg font-bold ${label === t.totalDifference && Number(value) !== 0 ? "text-danger" : ""}`}>{money(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

/** RF-18 a RF-22: el conteo como asistente; al terminar se entrega. */
function CountWizard({ cut, busy, error, onExit, onDeliver }: { cut: CutView; busy: boolean; error: string | null; onExit: () => void; onDeliver: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [pieces, setPieces] = useState<Record<string, number>>(cut.pieces ?? {});
  const others = cut.methods.filter((m) => !m.isCash);
  const [amounts, setAmounts] = useState<Record<string, string>>(Object.fromEntries(others.map((m) => [m.id, m.counted ?? ""])));
  const total = DENOMINATIONS.reduce((a, d) => a + d.cents * BigInt(pieces[d.cents.toString()] ?? 0), 0n);
  const setCount = (key: string, n: number) => setPieces((p) => ({ ...p, [key]: Math.max(0, Math.floor(Number.isFinite(n) ? n : 0)) }));
  const dirty = Object.values(pieces).some((n) => n > 0) || Object.values(amounts).some((a) => a !== "");
  return (
    <div className="flex flex-col gap-3" data-testid="count-wizard">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Wizard
        dirty={dirty}
        onExit={onExit}
        onFinish={() => void onDeliver({ pieces, amounts })}
        steps={[
          {
            id: "cash",
            title: t.countCash,
            content: (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-ink-muted">{t.countCashIntro}</p>
                <ul className="flex flex-col">
                  {DENOMINATIONS.map((d) => {
                    const key = d.cents.toString();
                    const label = t.denomination(pesos(d.cents), d.kind);
                    const n = pieces[key] ?? 0;
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
          },
          {
            id: "methods",
            title: t.countMethods,
            canContinue: others.every((m) => amounts[m.id] !== ""),
            content: (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-ink-muted">{t.countMethodsIntro}</p>
                {others.map((m) => (
                  <MoneyField key={m.id} label={m.name} value={amounts[m.id]} onChange={(e) => setAmounts((a) => ({ ...a, [m.id]: e.target.value }))} />
                ))}
              </div>
            ),
          },
          {
            id: "review",
            title: t.countReview,
            content: (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-ink-muted">{t.countReviewIntro}</p>
                <dl className="grid grid-cols-2 gap-2 text-sm tabular-nums">
                  <dt>{t.cashCounted}</dt>
                  <dd className="text-right font-semibold">{pesos(total)}</dd>
                  {others.map((m) => (
                    <div key={m.id} className="contents">
                      <dt>{m.name}</dt>
                      <dd className="text-right font-semibold">{amounts[m.id] ? formatMoney(Number(amounts[m.id].replace(/,/g, ""))) : "—"}</dd>
                    </div>
                  ))}
                </dl>
                {busy ? <p className="text-sm text-ink-muted">{es.common.loading}</p> : null}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
