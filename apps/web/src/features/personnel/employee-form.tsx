"use client";

// Spec 008 RF-9 a RF-13: alta de un empleado; el sueldo solo lo captura el dueño. Si ya hay un homónimo activo, el
// servidor avisa y se confirma (RF-12).
// Spec 015 RF-25, RF-27: carga lo capturado en el asistente «Nuevo empleado» y ofrece «Alta paso a paso».
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { es } from "@/i18n";
import { Alert, Button, MoneyField, PageHeader, SelectField, TextArea, TextField } from "@/ui";
import { api, formValues } from "../api";
import { discardWizardDraft, toWizard, useWizardDraftFor } from "../wizards/view-switch";
import type { NewEmployeeDraft } from "./wizards/new-employee";

const t = es.personnel;

export function EmployeeForm({ positions, owner, today }: { positions: { id: string; name: string }[]; owner: boolean; today: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefill, setPrefill] = useState<NewEmployeeDraft | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useWizardDraftFor<NewEmployeeDraft>("new-employee", setPrefill);

  async function stepByStep() {
    const v = formRef.current ? formValues(formRef.current) : {};
    const data: NewEmployeeDraft = { issued: prefill?.issued ?? {}, name: v.name ?? "", hiredOn: v.hiredOn || today, phone: v.phone ?? "", notes: v.notes ?? "", positionId: v.positionId ?? "", dailyPay: v.dailyPay ?? prefill?.dailyPay ?? "" };
    router.push(await toWizard("new-employee", "data", data, "/personal/nuevo"));
  }

  async function submit(form: HTMLFormElement, confirmDuplicate: boolean) {
    const v = formValues(form);
    setBusy(true);
    setError(null);
    const result = await api<{ employee: { id: string } }>("/api/employees", {
      body: { name: v.name, positionId: v.positionId, hiredOn: v.hiredOn, phone: v.phone, notes: v.notes, ...(owner && v.dailyPay ? { dailyPay: v.dailyPay } : {}), confirmDuplicate },
    });
    setBusy(false);
    if (!result.ok) {
      if (result.error.code === "employee_exists") setDuplicate(result.error.message);
      else setError(result.error.message);
      return;
    }
    if (prefill) await discardWizardDraft("new-employee");
    router.push(`/personal/${result.data.employee.id}`);
  }

  return (
    <>
      <PageHeader title={t.newTitle} subtitle={t.newIntro} />
      {positions.length === 0 ? <Alert tone="warning">{t.noPositions}</Alert> : null}
      <form
        key={prefill ? "prefill" : "blank"}
        ref={formRef}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget, duplicate !== null);
        }}
      >
        {error ? <Alert tone="error">{error}</Alert> : null}
        <TextField label={t.name} name="name" required maxLength={80} autoComplete="off" defaultValue={prefill?.name ?? ""} onChange={() => setDuplicate(null)} />
        <div className="grid gap-4 lg:grid-cols-2">
          <SelectField label={t.position} name="positionId" required defaultValue={prefill?.positionId ?? ""} options={[{ value: "", label: t.choosePosition }, ...positions.map((p) => ({ value: p.id, label: p.name }))]} />
          <TextField label={t.hiredOn} name="hiredOn" type="date" required defaultValue={prefill?.hiredOn || today} />
          <TextField label={t.phone} name="phone" type="tel" maxLength={30} defaultValue={prefill?.phone ?? ""} />
          {owner ? <MoneyField label={t.pay} name="dailyPay" hint={t.payHint} defaultValue={prefill?.dailyPay ?? ""} /> : null}
        </div>
        <TextArea label={t.notes} name="notes" rows={2} maxLength={500} defaultValue={prefill?.notes ?? ""} />
        {duplicate ? <Alert tone="warning">{duplicate}</Alert> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onAction={stepByStep}>
            {t.employeeWizard.stepByStep}
          </Button>
          <Button type="submit" loading={busy}>
            {duplicate ? t.continue : t.save}
          </Button>
        </div>
      </form>
    </>
  );
}
