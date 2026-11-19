"use client";

// Asistente «Nuevo proveedor» (spec 015, RF-45 y RF-44): Nombre y teléfono (con los parecidos), Comprador en la
// sucursal activa y Resumen. Usa `/api/suppliers` y `/api/supplier-buyers/[id]`, como la pantalla de proveedores; el
// comprador de otra sucursal se elige desde ella (spec 013).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { nameMatches } from "@/domain/catalog/names";
import { nextAfter } from "@/domain/wizards/next";
import { es } from "@/i18n";
import type { SupplierBuyersView } from "@/server/services/catalog/supplier-buyers";
import type { WizardExamples } from "@/server/services/wizards/examples";
import { Alert, Button, LinkButton, LoadingState, ResumePrompt, SelectField, TextArea, TextField, Wizard } from "@/ui";
import { api } from "../../api";
import { useWizardDraft } from "../../wizards/use-wizard-draft";
import { switchView, viewHref } from "../../wizards/view-switch";

const t = es.catalog;
const ts = t.suppliers;
const w = t.supplierWizard;

export interface NewSupplierDraft {
  name: string;
  phone: string;
  notes: string;
  confirmedName: string;
  employeeId: string;
}

export function NewSupplierWizard({ names, buyers, branchName, examples, autoResume }: { names: string[]; buyers: SupplierBuyersView | null; branchName: string; examples: WizardExamples; autoResume: boolean }) {
  const router = useRouter();
  // Sin permiso sobre la sucursal activa no se elige comprador (spec 013, RF-2): ese paso no aparece.
  const steps = buyers ? ["name", "buyer"] : ["name"];
  const draft = useWizardDraft<NewSupplierDraft>({ kind: "new-supplier", initial: { name: "", phone: "", notes: "", confirmedName: "", employeeId: "" }, steps, autoResume });
  const d = draft.data;
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ name: string; problem: string | null } | null>(null);

  if (done) {
    const next = nextAfter("new-supplier", { id: "" });
    return (
      <div className="flex flex-col gap-4" data-testid="wizard-done">
        <Alert tone={done.problem ? "warning" : "success"}>{done.problem ? w.partial(done.name, done.problem) : w.done(done.name)}</Alert>
        <div>
          <LinkButton href={next.href}>{es.common.then[next.key]}</LinkButton>
        </div>
      </div>
    );
  }
  if (!draft.loaded) return <LoadingState />;
  if (draft.prompt) return <ResumePrompt updatedAt={draft.prompt.updatedAt} stepTitle={w.steps[draft.prompt.step as keyof typeof w.steps] ?? w.steps.name} onContinue={draft.resume} onRestart={() => void draft.restart()} />;

  const set = (patch: Partial<NewSupplierDraft>) => draft.update((x) => ({ ...x, ...patch }));
  const matches = nameMatches(d.name, names);
  const similarPending = matches.similar.length > 0 && d.confirmedName !== d.name.trim();
  const buyerName = buyers?.employees.find((e) => e.id === d.employeeId)?.name ?? ts.noBuyer;
  const go = (i: number) => {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  };

  function checkName() {
    if (!d.name.trim()) return (setStepError(w.nameRequired), false);
    if (matches.same) return (setStepError(w.same(matches.same)), false);
    if (similarPending) return (setStepError(w.pendingSimilar), false);
    setStepError(null);
    return true;
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    const created = await api<{ supplier: { id: string; name: string } }>("/api/suppliers", { body: { name: d.name, phone: d.phone, notes: d.notes } });
    if (!created.ok) {
      setBusy(false);
      if (/name|phone/.test(created.error.code)) {
        go(0);
        setStepError(created.error.message);
      } else setError(created.error.message);
      return;
    }
    const s = created.data.supplier;
    let problem: string | null = null;
    if (buyers && d.employeeId) {
      const r = await api(`/api/supplier-buyers/${s.id}`, { method: "PUT", body: { employeeId: d.employeeId } });
      if (!r.ok) problem = r.error.message;
    }
    setBusy(false);
    await draft.discard();
    setDone({ name: s.name, problem });
  }

  const errorBox = stepError ? <Alert tone="error">{stepError}</Alert> : null;
  return (
    <Wizard
      dirty={d.name.trim() !== ""}
      saved
      index={draft.index}
      onIndexChange={go}
      onExit={() => router.push("/proveedores")}
      onFullView={() => void switchView("new-supplier", "full", draft.save).then(() => router.push(viewHref("/proveedores", "full")))}
      onFinish={() => void confirm()}
      review={{ confirmLabel: w.confirm, busy, extra: error ? <Alert tone="error">{error}</Alert> : null }}
      steps={[
        {
          id: "name",
          title: w.steps.name,
          hint: w.hints.name,
          example: examples.supplier ?? w.examples.name,
          validate: checkName,
          content: (
            <div className="flex flex-col gap-3">
              {errorBox}
              <TextField label={t.name} maxLength={80} autoComplete="off" value={d.name} onChange={(e) => set({ name: e.target.value })} />
              {matches.same ? <Alert tone="warning">{w.same(matches.same)}</Alert> : null}
              {!matches.same && matches.similar.length ? (
                <div role="status" className="flex flex-col gap-2 rounded-md border border-warning-soft bg-warning-soft px-3 py-2 text-sm text-warning" data-similar={similarPending ? "pending" : "confirmed"}>
                  <p className="font-semibold">{t.productWizard.similar(matches.similar.map((n) => `«${n}»`).join(", "))}</p>
                  {similarPending ? (
                    <div>
                      <Button variant="secondary" onClick={() => set({ confirmedName: d.name.trim() })}>
                        {w.confirmOther}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <TextField label={ts.phone} type="tel" maxLength={30} value={d.phone} onChange={(e) => set({ phone: e.target.value })} />
              <TextArea label={t.notes} rows={2} maxLength={500} value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
            </div>
          ),
          summary: `${d.name.trim()} · ${d.phone.trim() || w.noPhone}`,
        },
        ...(buyers
          ? [
              {
                id: "buyer",
                title: w.steps.buyer,
                hint: w.hints.buyer(branchName),
                example: buyers.employees[0]?.name,
                content: (
                  <div className="flex flex-col gap-3">
                    {errorBox}
                    <SelectField label={ts.buyerIn(branchName)} value={d.employeeId} onChange={(e) => set({ employeeId: e.target.value })} options={[{ value: "", label: ts.noBuyer }, ...buyers.employees.map((e) => ({ value: e.id, label: e.name }))]} />
                    {buyers.employees.length === 0 ? <p className="text-sm text-ink-muted">{ts.noStaffHint}</p> : null}
                  </div>
                ),
                summary: `${ts.buyerIn(branchName)}: ${buyerName}`,
              },
            ]
          : []),
      ]}
    />
  );
}
