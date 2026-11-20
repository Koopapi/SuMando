"use client";

// Asistente «Asistencia de la semana» (spec 015, RF-38 y RF-11): un paso por día que se puede marcar (quién trabajó,
// media jornada y retardos) y Resumen. Nada se guarda hasta confirmar; entonces cada cambio va a
// `/api/payroll/weeks/[start]/days`, como en la semana. El administrador nunca ve montos (spec 009, RF-5).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { nextAfter } from "@/domain/wizards/next";
import { es } from "@/i18n";
import type { PayrollRowView, PayrollWeekView } from "@/server/services/payroll/views";
import { Alert, Checkbox, LinkButton, LoadingState, ResumePrompt, SelectField, Wizard } from "@/ui";
import { api } from "../../api";
import { showDate } from "../../personnel/dates";
import { useWizardDraft } from "../../wizards/use-wizard-draft";
import { switchView, viewHref } from "../../wizards/view-switch";

const t = es.payroll;
const w = t.attendanceWizard;
type State = "empty" | "worked" | "half";
type Mark = { state: State; late: boolean };

interface AttendanceDraft {
  marks: Record<string, Mark>;
}

const cell = (employeeId: string, day: number) => `${employeeId}:${day}`;

export function AttendanceWizard({ week, autoResume }: { week: PayrollWeekView; autoResume: boolean }) {
  const router = useRouter();
  const rows = week.groups.flatMap((g) => g.rows);
  const days = [0, 1, 2, 3, 4, 5, 6].filter((i) => rows.some((r) => r.days[i].editable));
  const steps = days.map((i) => `day-${i}`);
  const draft = useWizardDraft<AttendanceDraft>({ kind: "pay-attendance", target: week.start, initial: { marks: {} }, steps, autoResume });
  const d = draft.data;
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const weekHref = viewHref(`/nomina/${week.start}`, "full", false);

  const original = (r: PayrollRowView, i: number): Mark => ({ state: r.days[i].state, late: r.days[i].late });
  const markOf = (r: PayrollRowView, i: number): Mark => d.marks[cell(r.employeeId, i)] ?? original(r, i);
  const setMark = (r: PayrollRowView, i: number, m: Mark) => draft.update((x) => ({ marks: { ...x.marks, [cell(r.employeeId, i)]: m } }));
  const changed = (r: PayrollRowView, i: number) => {
    const a = markOf(r, i);
    const b = original(r, i);
    return a.state !== b.state || (a.state !== "empty" && a.late !== b.late);
  };
  const changes = days.flatMap((i) => rows.filter((r) => r.days[i].editable && changed(r, i)).map((r) => ({ row: r, day: i })));

  if (done !== null) {
    const next = nextAfter("pay-attendance", { id: week.start });
    return (
      <div className="flex flex-col gap-4" data-testid="wizard-done">
        <Alert tone="success">{w.done(done)}</Alert>
        <div>
          <LinkButton href={next.href}>{es.common.then[next.key]}</LinkButton>
        </div>
      </div>
    );
  }
  if (week.status === "closed" || !rows.length || !days.length)
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="info">{week.status === "closed" ? w.closed : w.nobody}</Alert>
        <div>
          <LinkButton href={weekHref} variant="secondary">
            {w.back}
          </LinkButton>
        </div>
      </div>
    );
  if (!draft.loaded) return <LoadingState />;
  if (draft.prompt) {
    const day = Number(draft.prompt.step.replace("day-", ""));
    return <ResumePrompt updatedAt={draft.prompt.updatedAt} stepTitle={t.dayNames[day] ?? t.dayNames[days[0]]} onContinue={draft.resume} onRestart={() => void draft.restart()} />;
  }

  const go = (i: number) => {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  };

  async function confirm() {
    setBusy(true);
    setError(null);
    let count = 0;
    for (const c of changes) {
      const m = markOf(c.row, c.day);
      const result = await api(`/api/payroll/weeks/${week.start}/days`, { method: "PUT", body: { employeeId: c.row.employeeId, day: c.day, state: m.state, late: m.state === "empty" ? false : m.late } });
      if (!result.ok) {
        setBusy(false);
        // RF-10: el día con el error vuelve a su paso; los cambios anteriores ya quedaron guardados.
        go(days.indexOf(c.day));
        setStepError(result.error.message);
        return;
      }
      count++;
    }
    setBusy(false);
    await draft.discard();
    setDone(count);
  }

  const first = rows[0];
  const options = (["worked", "half", "empty"] as const).map((s) => ({ value: s, label: t.states[s] }));
  return (
    <Wizard
      dirty={changes.length > 0}
      saved
      index={draft.index}
      onIndexChange={go}
      onExit={() => router.push(weekHref)}
      onFullView={() => void switchView("pay-attendance", "full", draft.save).then(() => router.push(weekHref))}
      onFinish={() => void confirm()}
      review={{ confirmLabel: w.confirm, busy, canConfirm: changes.length > 0, extra: error ? <Alert tone="error">{error}</Alert> : !changes.length ? <Alert tone="warning">{w.nothing}</Alert> : null }}
      steps={days.map((i) => {
        const dayChanges = rows.filter((r) => r.days[i].editable && changed(r, i));
        return {
          id: `day-${i}`,
          title: `${t.dayNames[i]} ${showDate(week.dates[i])}`,
          hint: w.hint,
          example: first ? w.example(first.name) : w.exampleGeneric,
          content: (
            <div className="flex flex-col gap-3">
              {stepError ? <Alert tone="error">{stepError}</Alert> : null}
              <ul className="flex flex-col">
                {rows.map((r) => {
                  const m = markOf(r, i);
                  return (
                    <li key={r.employeeId} className="flex min-w-0 flex-col gap-2 border-t border-line py-3" data-testid="attendance-row">
                      <span className="flex flex-wrap justify-between gap-x-3">
                        <span className="font-semibold break-words">{r.name}</span>
                        <span className="text-sm text-ink-muted">{r.position}</span>
                      </span>
                      {r.days[i].editable ? (
                        <div className="flex flex-wrap items-end gap-3">
                          <SelectField label={w.stateOf(r.name)} hideLabel className="min-w-0 flex-1" value={m.state} onChange={(e) => setMark(r, i, { state: e.target.value as State, late: e.target.value === "empty" ? false : m.late })} options={options} />
                          <Checkbox label={w.lateOf(r.name)} checked={m.late} disabled={m.state === "empty"} onChange={(e) => setMark(r, i, { ...m, late: e.target.checked })} />
                        </div>
                      ) : (
                        <span className="text-sm text-ink-muted">{w.notEditable}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ),
          summary: dayChanges.length ? (
            <ul className="flex flex-col text-sm">
              {dayChanges.map((r) => {
                const m = markOf(r, i);
                return <li key={r.employeeId}>{w.change(r.name, t.states[m.state], m.state !== "empty" && m.late)}</li>;
              })}
            </ul>
          ) : (
            w.noChanges
          ),
        };
      })}
    />
  );
}
