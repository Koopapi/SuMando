"use client";

// Asistente «Nuevo empleado» (spec 015, RF-46 y RF-11): Datos, Puesto, Sueldo por día (solo el dueño), Documentos y
// Resumen. Da de alta con `/api/employees` (con el aviso de homónimo de la spec 008) y sube cada documento elegido con
// la ruta del expediente. Los archivos no viajan en lo guardado a medias: se eligen y se suben al confirmar.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { nextAfter } from "@/domain/wizards/next";
import { es } from "@/i18n";
import type { DocumentTypeView } from "@/server/services/personnel/document-types";
import { Alert, FileField, LinkButton, LoadingState, MoneyField, ResumePrompt, SelectField, StatusBadge, TextArea, TextField, Wizard, formatMoney } from "@/ui";
import { api } from "../../api";
import { showDate } from "../dates";
import { useWizardDraft } from "../../wizards/use-wizard-draft";
import { switchView, viewHref } from "../../wizards/view-switch";

const t = es.personnel;
const w = t.employeeWizard;

export interface NewEmployeeDraft {
  name: string;
  hiredOn: string;
  phone: string;
  notes: string;
  positionId: string;
  dailyPay: string;
  /** Fecha de expedición por tipo de documento (los archivos no se guardan a medias). */
  issued: Record<string, string>;
}

export function NewEmployeeWizard({ positions, documentTypes, owner, today, autoResume }: { positions: { id: string; name: string }[]; documentTypes: DocumentTypeView[]; owner: boolean; today: string; autoResume: boolean }) {
  const router = useRouter();
  // RF-11: el paso del sueldo solo existe para el dueño (spec 008, RF-10).
  const steps = owner ? ["data", "position", "pay", "documents"] : ["data", "position", "documents"];
  const initial: NewEmployeeDraft = { name: "", hiredOn: today, phone: "", notes: "", positionId: positions.length === 1 ? positions[0].id : "", dailyPay: "", issued: {} };
  const draft = useWizardDraft<NewEmployeeDraft>({ kind: "new-employee", initial, steps, autoResume });
  const d = draft.data;
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; name: string; problem: string | null } | null>(null);
  const types = documentTypes.filter((x) => !x.archived);

  if (done) {
    const next = nextAfter("new-employee", { id: done.id });
    return (
      <div className="flex flex-col gap-4" data-testid="wizard-done">
        <Alert tone={done.problem ? "warning" : "success"}>{done.problem ? w.partial(done.name, done.problem) : w.done(done.name)}</Alert>
        <div>
          <LinkButton href={next.href}>{es.common.then[next.key]}</LinkButton>
        </div>
      </div>
    );
  }
  if (!positions.length) return <Alert tone="warning">{t.noPositions}</Alert>;
  if (!draft.loaded) return <LoadingState />;
  if (draft.prompt) return <ResumePrompt updatedAt={draft.prompt.updatedAt} stepTitle={w.steps[draft.prompt.step as keyof typeof w.steps] ?? w.steps.data} onContinue={draft.resume} onRestart={() => void draft.restart()} />;

  const set = (patch: Partial<NewEmployeeDraft>) => {
    if (patch.name !== undefined) setDuplicate(null);
    draft.update((x) => ({ ...x, ...patch }));
  };
  const chosen = types.filter((x) => files[x.id]?.length);
  const position = positions.find((p) => p.id === d.positionId);
  const go = (i: number) => {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  };
  const stepOf = (id: string) => steps.indexOf(id);

  async function upload(employeeId: string, type: DocumentTypeView): Promise<string | null> {
    const data = new FormData();
    for (const f of files[type.id]) data.append("file", f);
    if (type.validityMonths) data.set("issuedOn", d.issued[type.id] || today);
    try {
      const res = await fetch(`/api/employees/${employeeId}/documents/${type.id}`, { method: "POST", body: data });
      if (res.ok) return null;
      const body = await res.json().catch(() => null);
      return `${type.name}: ${body?.error?.message ?? es.common.unknownError}`;
    } catch {
      return `${type.name}: ${es.common.unknownError}`;
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    const created = await api<{ employee: { id: string; name: string } }>("/api/employees", {
      body: { name: d.name, positionId: d.positionId, hiredOn: d.hiredOn, phone: d.phone, notes: d.notes, ...(owner && d.dailyPay.trim() ? { dailyPay: d.dailyPay } : {}), confirmDuplicate: duplicate !== null },
    });
    if (!created.ok) {
      setBusy(false);
      // Spec 008, RF-12: con un homónimo activo, el resumen pide confirmar que es otra persona.
      if (created.error.code === "employee_exists") return setDuplicate(created.error.message);
      if (/pay|amount/.test(created.error.code) && owner) go(stepOf("pay"));
      else if (/position/.test(created.error.code)) go(stepOf("position"));
      else if (/name|date|hired|phone/.test(created.error.code)) go(stepOf("data"));
      else return setError(created.error.message);
      setStepError(created.error.message);
      return;
    }
    const e = created.data.employee;
    const problems: string[] = [];
    for (const type of chosen) {
      const problem = await upload(e.id, type);
      if (problem) problems.push(problem);
    }
    setBusy(false);
    await draft.discard();
    setDone({ id: e.id, name: e.name, problem: problems.length ? problems.join(" ") : null });
  }

  const errorBox = stepError ? <Alert tone="error">{stepError}</Alert> : null;
  return (
    <Wizard
      dirty={d.name.trim() !== ""}
      saved
      index={draft.index}
      onIndexChange={go}
      onExit={() => router.push("/personal")}
      onFullView={() => void switchView("new-employee", "full", draft.save).then(() => router.push(viewHref("/personal/nuevo", "full")))}
      onFinish={() => void confirm()}
      review={{
        confirmLabel: duplicate ? t.continue : w.confirm,
        busy,
        extra: (
          <div className="flex flex-col gap-3">
            {duplicate ? <Alert tone="warning">{duplicate}</Alert> : null}
            {error ? <Alert tone="error">{error}</Alert> : null}
          </div>
        ),
      }}
      steps={[
        {
          id: "data",
          title: w.steps.data,
          hint: w.hints.data,
          example: w.examples.data,
          validate: () => (!d.name.trim() ? (setStepError(w.nameRequired), false) : !d.hiredOn ? (setStepError(w.hiredRequired), false) : (setStepError(null), true)),
          content: (
            <div className="flex flex-col gap-3">
              {errorBox}
              <TextField label={t.name} maxLength={80} autoComplete="off" value={d.name} onChange={(e) => set({ name: e.target.value })} />
              <TextField label={t.hiredOn} type="date" value={d.hiredOn} onChange={(e) => set({ hiredOn: e.target.value })} />
              <TextField label={t.phone} type="tel" maxLength={30} value={d.phone} onChange={(e) => set({ phone: e.target.value })} />
              <TextArea label={t.notes} rows={2} maxLength={500} value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
            </div>
          ),
          summary: `${d.name.trim()} · ${t.hiredOn} ${showDate(d.hiredOn || null)}${d.phone.trim() ? ` · ${d.phone.trim()}` : ""}`,
        },
        {
          id: "position",
          title: w.steps.position,
          hint: w.hints.position,
          example: positions[0]?.name,
          validate: () => (position ? (setStepError(null), true) : (setStepError(w.choosePosition), false)),
          content: (
            <div className="flex flex-col gap-3">
              {errorBox}
              <SelectField label={t.position} value={d.positionId} onChange={(e) => set({ positionId: e.target.value })} options={[{ value: "", label: t.choosePosition }, ...positions.map((p) => ({ value: p.id, label: p.name }))]} />
            </div>
          ),
          summary: position?.name ?? "",
        },
        ...(owner
          ? [
              {
                id: "pay",
                title: w.steps.pay,
                hint: w.hints.pay,
                example: w.examples.pay,
                content: (
                  <div className="flex flex-col gap-3">
                    {errorBox}
                    <MoneyField label={t.pay} hint={t.payHint} value={d.dailyPay} onChange={(e) => set({ dailyPay: e.target.value })} />
                  </div>
                ),
                summary: d.dailyPay.trim() ? formatMoney(Number(d.dailyPay.replace(/,/g, ""))) : w.noPay,
              },
            ]
          : []),
        {
          id: "documents",
          title: w.steps.documents,
          hint: w.hints.documents,
          content: (
            <div className="flex flex-col gap-4">
              {errorBox}
              {types.length === 0 ? <p className="text-sm text-ink-muted">{w.noDocumentTypes}</p> : <p className="text-sm text-ink-muted">{w.chooseAgain}</p>}
              {types.map((x) => (
                <fieldset key={x.id} className="flex min-w-0 flex-col gap-3 border-t border-line pt-3" data-testid="new-employee-document">
                  <legend className="flex flex-wrap items-center gap-2 font-semibold">
                    {x.name}
                    {x.required ? <StatusBadge tone="warning">{t.required}</StatusBadge> : null}
                  </legend>
                  <FileField label={w.filesOf(x.name)} hint={t.fileHint} accept="image/*,application/pdf" multiple onChange={(e) => setFiles((f) => ({ ...f, [x.id]: Array.from(e.target.files ?? []) }))} />
                  {x.validityMonths ? <TextField label={w.issuedOf(x.name)} type="date" value={d.issued[x.id] ?? today} onChange={(e) => set({ issued: { ...d.issued, [x.id]: e.target.value } })} /> : null}
                </fieldset>
              ))}
            </div>
          ),
          summary: (
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">{w.documentsLine(chosen.length)}</span>
              {chosen.map((x) => (
                <span key={x.id}>
                  {x.name} · {files[x.id].map((f) => f.name).join(", ")}
                </span>
              ))}
            </div>
          ),
        },
      ]}
    />
  );
}
