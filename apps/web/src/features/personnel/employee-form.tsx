"use client";

// Spec 008 RF-9 a RF-13: alta de un empleado; el sueldo solo lo captura el dueño. Si ya hay un homónimo activo, el
// servidor avisa y se confirma (RF-12).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import { Alert, Button, MoneyField, PageHeader, SelectField, TextArea, TextField } from "@/ui";
import { api, formValues } from "../api";

const t = es.personnel;

export function EmployeeForm({ positions, owner, today }: { positions: { id: string; name: string }[]; owner: boolean; today: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    router.push(`/personal/${result.data.employee.id}`);
  }

  return (
    <>
      <PageHeader title={t.newTitle} subtitle={t.newIntro} />
      {positions.length === 0 ? <Alert tone="warning">{t.noPositions}</Alert> : null}
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget, duplicate !== null);
        }}
      >
        {error ? <Alert tone="error">{error}</Alert> : null}
        <TextField label={t.name} name="name" required maxLength={80} autoComplete="off" onChange={() => setDuplicate(null)} />
        <div className="grid gap-4 lg:grid-cols-2">
          <SelectField label={t.position} name="positionId" required options={[{ value: "", label: t.choosePosition }, ...positions.map((p) => ({ value: p.id, label: p.name }))]} />
          <TextField label={t.hiredOn} name="hiredOn" type="date" required defaultValue={today} />
          <TextField label={t.phone} name="phone" type="tel" maxLength={30} />
          {owner ? <MoneyField label={t.pay} name="dailyPay" hint={t.payHint} /> : null}
        </div>
        <TextArea label={t.notes} name="notes" rows={2} maxLength={500} />
        {duplicate ? <Alert tone="warning">{duplicate}</Alert> : null}
        <div className="flex justify-end">
          <Button type="submit" loading={busy}>
            {duplicate ? t.continue : t.save}
          </Button>
        </div>
      </form>
    </>
  );
}
