"use client";

// Asistente «Aprobar requisición» (spec 015, RF-30 y RF-21): Revisar por proveedor (ajustar o quitar renglones),
// Decisión (aprobar o rechazar con motivo) y Resumen. Usa `/api/requisitions/[id]/approve` y `/reject`, como la
// pantalla completa; si otra persona ya la decidió, no deja confirmar.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseMilli } from "@/domain/catalog/units";
import { nextAfter } from "@/domain/wizards/next";
import { es } from "@/i18n";
import type { LineView, RequisitionView } from "@/server/services/requisitions/views";
import type { WizardExamples } from "@/server/services/wizards/examples";
import { Alert, Button, LinkButton, LoadingState, NumberField, ResumePrompt, SelectField, TextArea, Wizard, formatQuantity } from "@/ui";
import { api } from "../../api";
import { unitShort } from "../../catalog/labels";
import { useWizardDraft } from "../../wizards/use-wizard-draft";
import { switchView } from "../../wizards/view-switch";

const t = es.requisitions;
const w = t.approveWizard;
const STEPS = ["review", "decision"];

interface ApproveDraft {
  edits: Record<string, { quantity: string; removed: boolean }>;
  decision: "" | "approve" | "reject";
  reason: string;
}

const unitOf = (l: LineView) => l.presentation.name ?? unitShort(l.baseUnit);
const qty = (q: string, l: LineView) => t.qty(formatQuantity(q), unitOf(l));
const sameQty = (a: string, b: string) => parseMilli(a.trim()) !== null && parseMilli(a.trim()) === parseMilli(b);

export function ApproveRequisitionWizard({ requisition: r, examples, autoResume }: { requisition: RequisitionView; examples: WizardExamples; autoResume: boolean }) {
  const router = useRouter();
  const initial: ApproveDraft = { edits: Object.fromEntries(r.lines.map((l) => [l.id, { quantity: formatQuantity(l.quantity), removed: false }])), decision: "", reason: "" };
  const draft = useWizardDraft({ kind: "req-approve", target: r.id, initial, steps: STEPS, autoResume });
  const d = draft.data;
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | "approve" | "reject">(null);
  const edit = (l: LineView) => d.edits[l.id] ?? { quantity: formatQuantity(l.quantity), removed: false };
  const setEdit = (id: string, patch: Partial<{ quantity: string; removed: boolean }>) => draft.update((x) => ({ ...x, edits: { ...x.edits, [id]: { ...(x.edits[id] ?? { quantity: "", removed: false }), ...patch } } }));
  const kept = r.lines.filter((l) => !edit(l).removed);
  const changes = r.lines.filter((l) => edit(l).removed || !sameQty(edit(l).quantity, l.quantity));
  const go = (i: number) => {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  };

  if (done) {
    const next = nextAfter("req-approve", { id: r.id });
    return (
      <div className="flex flex-col gap-4" data-testid="wizard-done">
        <Alert tone="success">{done === "approve" ? w.doneApproved(r.folio) : w.doneRejected(r.folio)}</Alert>
        <div>
          <LinkButton href={done === "approve" ? next.href : `/requisiciones/${r.id}`}>{done === "approve" ? es.common.then[next.key] : es.common.then.seeRequisition}</LinkButton>
        </div>
      </div>
    );
  }
  // RF-21: otra persona ya la decidió (o se canceló) desde que se empezó.
  if (!r.canDecide)
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="warning">{t.wizard.alreadyDecided(t.statuses[r.status].toLowerCase())}</Alert>
        <div>
          <LinkButton href={`/requisiciones/${r.id}`} variant="secondary">
            {t.wizard.back(r.folio)}
          </LinkButton>
        </div>
      </div>
    );
  if (!draft.loaded) return <LoadingState />;
  if (draft.prompt) return <ResumePrompt updatedAt={draft.prompt.updatedAt} stepTitle={w.steps[draft.prompt.step as keyof typeof w.steps] ?? w.steps.review} onContinue={draft.resume} onRestart={() => void draft.restart()} />;

  function checkReview() {
    const bad = kept.find((l) => !parseMilli(edit(l).quantity.trim()) || parseMilli(edit(l).quantity.trim()) === 0n);
    if (bad) return (setStepError(t.receiveWizard.invalid(bad.name)), false);
    setStepError(null);
    return true;
  }

  function checkDecision() {
    if (!d.decision) return (setStepError(w.chooseDecision), false);
    if (d.decision === "reject" && !d.reason.trim()) return (setStepError(w.reasonRequired), false);
    if (d.decision === "approve" && kept.length === 0) return (setStepError(w.noneLeft), false);
    setStepError(null);
    return true;
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    const body =
      d.decision === "reject"
        ? { reason: d.reason.trim() }
        : changes.length
          ? { lines: kept.map((l) => ({ productId: l.productId, quantity: edit(l).quantity.trim(), presentationId: l.presentation.id, supplierId: l.supplierId })) }
          : {};
    const result = await api(`/api/requisitions/${r.id}/${d.decision === "reject" ? "reject" : "approve"}`, { body });
    setBusy(false);
    if (!result.ok) {
      // RF-10: un renglón inválido regresa a la revisión; lo demás (estado, permiso) se queda en el resumen.
      if (result.error.code === "invalid_line_quantity" || result.error.code === "requisition_empty") {
        go(0);
        setStepError(result.error.message);
      } else setError(result.error.message);
      return;
    }
    await draft.discard();
    setDone(d.decision === "reject" ? "reject" : "approve");
  }

  const first = r.lines[0];
  return (
    <Wizard
      dirty={changes.length > 0 || d.decision !== ""}
      saved
      index={draft.index}
      onIndexChange={go}
      onExit={() => router.push(`/requisiciones/${r.id}`)}
      onFullView={() => void switchView("req-approve", "full", draft.save).then(() => router.push(`/requisiciones/${r.id}`))}
      onFinish={() => void confirm()}
      review={{ confirmLabel: d.decision === "reject" ? w.reject : w.approve, busy, extra: error ? <Alert tone="error">{error}</Alert> : null }}
      steps={[
        {
          id: "review",
          title: w.steps.review,
          hint: w.hints.review,
          example: first ? w.example(formatQuantity(first.quantity), unitOf(first), first.name) : examples.product ? w.example("2", examples.product.presentation ?? "", examples.product.name) : w.exampleGeneric,
          validate: checkReview,
          content: (
            <div className="flex flex-col gap-4">
              {stepError ? <Alert tone="error">{stepError}</Alert> : null}
              {r.groups.map((g) => (
                <section key={g.supplierId ?? "none"} aria-label={g.supplierName ?? t.groupNoSupplier} className="flex flex-col gap-2">
                  <h3 className="border-b-2 border-line-strong pb-1 font-brand text-lg font-bold">{g.supplierName ?? t.groupNoSupplier}</h3>
                  {r.lines
                    .filter((l) => g.lineIds.includes(l.id))
                    .map((l) => {
                      const e = edit(l);
                      return (
                        <div key={l.id} className="flex min-w-0 flex-col gap-1 border-b border-line py-2" data-testid="approve-line">
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <span className="truncate font-semibold">{l.name}</span>
                            <Button variant="ghost" onClick={() => setEdit(l.id, { removed: !e.removed })}>
                              {e.removed ? w.restore(l.name) : w.remove(l.name)}
                            </Button>
                          </div>
                          {e.removed ? (
                            <span className="text-sm text-ink-muted">{w.removed}</span>
                          ) : (
                            <NumberField label={`${t.quantity} · ${l.name}`} hint={`${t.colRequested}: ${qty(l.requested, l)}`} trailing={<span className="text-sm text-ink-muted">{unitOf(l)}</span>} value={e.quantity} onChange={(ev) => setEdit(l.id, { quantity: ev.target.value })} />
                          )}
                        </div>
                      );
                    })}
                </section>
              ))}
            </div>
          ),
          summary: changes.length ? (
            <div className="flex flex-col gap-1">
              <span className="font-semibold">{w.changes(changes.length)}</span>
              {changes.map((l) => (
                <span key={l.id} className="text-sm">
                  {edit(l).removed ? w.removedLine(l.name) : w.change(l.name, qty(l.quantity, l), qty(edit(l).quantity || "0", l))}
                </span>
              ))}
            </div>
          ) : (
            w.noChanges
          ),
        },
        {
          id: "decision",
          title: w.steps.decision,
          hint: w.hints.decision,
          validate: checkDecision,
          content: (
            <div className="flex flex-col gap-3">
              {stepError ? <Alert tone="error">{stepError}</Alert> : null}
              <SelectField
                label={w.decisionLabel}
                value={d.decision}
                onChange={(e) => draft.update((x) => ({ ...x, decision: e.target.value as ApproveDraft["decision"] }))}
                options={[
                  { value: "", label: w.chooseDecision },
                  { value: "approve", label: w.approveOption },
                  { value: "reject", label: w.rejectOption },
                ]}
              />
              {d.decision === "reject" ? <TextArea label={t.reason} rows={2} maxLength={200} hint={t.reasonHint} value={d.reason} onChange={(e) => draft.update((x) => ({ ...x, reason: e.target.value }))} /> : null}
            </div>
          ),
          summary: d.decision === "reject" ? `${w.rejectOption}: ${d.reason}` : d.decision === "approve" ? w.approveOption : "",
        },
      ]}
    />
  );
}
