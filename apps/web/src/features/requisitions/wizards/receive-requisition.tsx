"use client";

// Asistente «Recibir» (spec 015, RF-32): Proveedor, Cantidades recibidas (propone lo pendiente) y Resumen. Registra
// con `/api/requisitions/[id]/receive`, la misma entrada al inventario que la pantalla completa.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseMilli } from "@/domain/catalog/units";
import { nextAfter } from "@/domain/wizards/next";
import { es } from "@/i18n";
import type { GroupView, LineView, RequisitionView } from "@/server/services/requisitions/views";
import type { WizardExamples } from "@/server/services/wizards/examples";
import { Alert, LinkButton, LoadingState, NumberField, ResumePrompt, SelectField, Wizard, formatQuantity } from "@/ui";
import { api } from "../../api";
import { unitShort } from "../../catalog/labels";
import { useWizardDraft } from "../../wizards/use-wizard-draft";
import { switchView } from "../../wizards/view-switch";

const t = es.requisitions;
const w = t.receiveWizard;
const STEPS = ["supplier", "quantities"];

interface ReceiveDraft {
  groupId: string;
  quantities: Record<string, string>;
}

const unitOf = (l: LineView) => l.presentation.name ?? unitShort(l.baseUnit);
const receivable = (g: GroupView) => !!g.id && !!g.purchasedAt && g.status !== "received";

export function ReceiveRequisitionWizard({ requisition: r, examples, group, autoResume }: { requisition: RequisitionView; examples: WizardExamples; group?: string; autoResume: boolean }) {
  const router = useRouter();
  const groups = r.groups.filter(receivable);
  const start = groups.find((g) => g.id === group)?.id ?? (groups.length === 1 ? groups[0].id! : "");
  const draft = useWizardDraft<ReceiveDraft>({ kind: "req-receive", target: r.id, initial: { groupId: start, quantities: {} }, steps: STEPS, autoResume });
  const d = draft.data;
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const chosen = groups.find((g) => g.id === d.groupId);
  const lines = chosen ? r.lines.filter((l) => chosen.lineIds.includes(l.id) && !l.closed) : [];
  const value = (l: LineView) => d.quantities[l.id] ?? l.pending;
  const name = (g: GroupView) => g.supplierName ?? t.groupNoSupplier;
  const go = (i: number) => {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  };

  if (done) {
    const next = nextAfter("req-receive", { id: r.id });
    return (
      <div className="flex flex-col gap-4" data-testid="wizard-done">
        <Alert tone="success">{w.done(done)}</Alert>
        <div>
          <LinkButton href={next.href}>{es.common.then[next.key]}</LinkButton>
        </div>
      </div>
    );
  }
  if (!groups.length)
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="info">{t.wizard.notAvailable}</Alert>
        <div>
          <LinkButton href={`/requisiciones/${r.id}`} variant="secondary">
            {t.wizard.back(r.folio)}
          </LinkButton>
        </div>
      </div>
    );
  if (!draft.loaded) return <LoadingState />;
  if (draft.prompt) return <ResumePrompt updatedAt={draft.prompt.updatedAt} stepTitle={w.steps[draft.prompt.step as keyof typeof w.steps] ?? w.steps.supplier} onContinue={draft.resume} onRestart={() => void draft.restart()} />;

  async function confirm() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    const result = await api(`/api/requisitions/${r.id}/receive`, { body: { groupId: chosen.id, lines: lines.map((l) => ({ lineId: l.id, quantity: value(l).trim() || "0", presentationId: l.presentation.id })) } });
    setBusy(false);
    if (!result.ok) {
      if (result.error.code.includes("quantity")) {
        go(1);
        setStepError(result.error.message);
      } else setError(result.error.message);
      return;
    }
    await draft.discard();
    setDone(name(chosen));
  }

  const first = lines[0];
  return (
    <Wizard
      dirty={Object.keys(d.quantities).length > 0}
      saved
      index={draft.index}
      onIndexChange={go}
      onExit={() => router.push(`/requisiciones/${r.id}`)}
      onFullView={() => void switchView("req-receive", "full", draft.save).then(() => router.push(`/requisiciones/${r.id}`))}
      onFinish={() => void confirm()}
      review={{ confirmLabel: w.confirm, busy, extra: error ? <Alert tone="error">{error}</Alert> : null }}
      steps={[
        {
          id: "supplier",
          title: w.steps.supplier,
          hint: w.hints.supplier,
          example: groups[0] ? name(groups[0]) : (examples.supplier ?? undefined),
          validate: () => (chosen ? true : (setStepError(w.chooseSupplier), false)),
          content: (
            <div className="flex flex-col gap-3">
              {stepError ? <Alert tone="error">{stepError}</Alert> : null}
              <SelectField label={w.supplierLabel} value={d.groupId} onChange={(e) => draft.update((x) => ({ ...x, groupId: e.target.value, quantities: {} }))} options={[{ value: "", label: w.chooseSupplier }, ...groups.map((g) => ({ value: g.id!, label: name(g) }))]} />
            </div>
          ),
          summary: chosen ? name(chosen) : "",
        },
        {
          id: "quantities",
          title: w.steps.quantities,
          hint: w.hints.quantities,
          example: first ? w.example(formatQuantity(first.pending), unitOf(first), first.name) : w.exampleGeneric,
          validate: () => {
            const bad = lines.find((l) => parseMilli(value(l).trim() || "0") === null);
            if (bad) return (setStepError(w.invalid(bad.name)), false);
            setStepError(null);
            return true;
          },
          content: (
            <div className="flex flex-col gap-3">
              {stepError ? <Alert tone="error">{stepError}</Alert> : null}
              {lines.map((l) => (
                <NumberField key={l.id} label={t.receivedOf(l.name)} hint={w.pendingOf(t.qty(formatQuantity(l.pending), unitOf(l)))} trailing={<span className="text-sm text-ink-muted">{unitOf(l)}</span>} value={value(l)} onChange={(e) => draft.update((x) => ({ ...x, quantities: { ...x.quantities, [l.id]: e.target.value } }))} />
              ))}
            </div>
          ),
          summary: (
            <ul className="flex flex-col text-sm">
              {lines.map((l) => (
                <li key={l.id}>{w.line(l.name, t.qty(formatQuantity(value(l) || "0"), unitOf(l)))}</li>
              ))}
            </ul>
          ),
        },
      ]}
    />
  );
}
