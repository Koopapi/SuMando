"use client";

// Asistente «Recibir traspaso» (spec 015, RF-37): Cantidades recibidas (propone lo enviado y el producto donde
// entra) y Resumen. Registra con `/api/inventory/transfers/[id]/receive`, como el detalle del traspaso.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseMilli } from "@/domain/catalog/units";
import { nextAfter } from "@/domain/wizards/next";
import { es } from "@/i18n";
import type { ProductOption, TransferLineView, TransferView } from "@/server/services/inventory/views";
import { Alert, LinkButton, LoadingState, NumberField, ResumePrompt, SelectField, Wizard, formatQuantity } from "@/ui";
import { api } from "../../api";
import { unitShort } from "../../catalog/labels";
import { useWizardDraft } from "../../wizards/use-wizard-draft";
import { switchView } from "../../wizards/view-switch";

const t = es.inventory;
const w = t.receiveWizard;
const STEPS = ["quantities"];

interface ReceiveDraft {
  lines: Record<string, { productId: string; quantity: string }>;
}

export function ReceiveTransferWizard({ transfer, products, autoResume }: { transfer: TransferView; products: ProductOption[]; autoResume: boolean }) {
  const router = useRouter();
  const draft = useWizardDraft<ReceiveDraft>({ kind: "inv-transfer-receive", target: transfer.id, initial: { lines: {} }, steps: STEPS, autoResume });
  const d = draft.data;
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const detail = `/inventario/traspasos/${transfer.id}`;
  const entry = (l: TransferLineView) => d.lines[l.id] ?? { productId: l.proposedProductId ?? "", quantity: l.sent };
  const setEntry = (l: TransferLineView, patch: Partial<{ productId: string; quantity: string }>) => draft.update((x) => ({ lines: { ...x.lines, [l.id]: { ...entry(l), ...patch } } }));
  const name = (id: string) => products.find((p) => p.id === id)?.name ?? "";
  const unit = (l: TransferLineView) => unitShort(l.baseUnit);

  if (done) {
    const next = nextAfter("inv-transfer-receive", { id: transfer.id });
    return (
      <div className="flex flex-col gap-4" data-testid="wizard-done">
        <Alert tone="success">{w.done}</Alert>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={next.href}>{es.common.then[next.key]}</LinkButton>
          <LinkButton href={detail} variant="secondary">
            {w.back}
          </LinkButton>
        </div>
      </div>
    );
  }
  if (!transfer.canReceive)
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="info">{w.notAvailable}</Alert>
        <div>
          <LinkButton href={detail} variant="secondary">
            {w.back}
          </LinkButton>
        </div>
      </div>
    );
  if (!draft.loaded) return <LoadingState />;
  if (draft.prompt) return <ResumePrompt updatedAt={draft.prompt.updatedAt} stepTitle={w.steps.quantities} onContinue={draft.resume} onRestart={() => void draft.restart()} />;

  function check() {
    for (const l of transfer.lines) {
      const e = entry(l);
      if (!e.productId) return (setStepError(w.chooseInto(l.name)), false);
      if (parseMilli(e.quantity.trim() || "0") === null) return (setStepError(w.invalid(l.name)), false);
    }
    setStepError(null);
    return true;
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    const lines = transfer.lines.map((l) => ({ lineId: l.id, productId: entry(l).productId || null, quantity: entry(l).quantity.trim() || "0" }));
    const result = await api(`/api/inventory/transfers/${transfer.id}/receive`, { body: { lines } });
    setBusy(false);
    if (!result.ok) {
      // RF-10: un renglón inválido regresa a las cantidades; lo demás (ya recibido, permiso) se queda en el resumen.
      if (/quantity|product|line/.test(result.error.code)) {
        go(0);
        setStepError(result.error.message);
      } else setError(result.error.message);
      return;
    }
    await draft.discard();
    setDone(true);
  }

  function go(i: number) {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  }

  const first = transfer.lines[0];
  return (
    <Wizard
      dirty={Object.keys(d.lines).length > 0}
      saved
      index={draft.index}
      onIndexChange={go}
      onExit={() => router.push(detail)}
      onFullView={() => void switchView("inv-transfer-receive", "full", draft.save).then(() => router.push(detail))}
      onFinish={() => void confirm()}
      review={{ confirmLabel: t.confirmReceive, busy, extra: error ? <Alert tone="error">{error}</Alert> : null }}
      steps={[
        {
          id: "quantities",
          title: w.steps.quantities,
          hint: w.hints.quantities,
          example: first ? w.example(formatQuantity(first.sent), unit(first), first.name) : w.exampleGeneric,
          validate: check,
          content: (
            <div className="flex flex-col gap-3">
              {stepError ? <Alert tone="error">{stepError}</Alert> : null}
              <ol className="flex flex-col">
                {transfer.lines.map((l) => {
                  const e = entry(l);
                  const same = products.filter((p) => p.baseUnit === l.baseUnit);
                  return (
                    <li key={l.id} className="flex min-w-0 flex-col gap-2 border-t border-line py-3" data-testid="receive-transfer-line">
                      <p className="font-semibold break-words">
                        {l.name} · {t.sent} {formatQuantity(l.sent)} {unit(l)}
                      </p>
                      <NumberField label={t.receivedQuantity(unit(l))} value={e.quantity} onChange={(ev) => setEntry(l, { quantity: ev.target.value })} />
                      <SelectField label={t.receiveInto} value={e.productId} onChange={(ev) => setEntry(l, { productId: ev.target.value })} options={[{ value: "", label: t.chooseProduct }, ...same.map((p) => ({ value: p.id, label: p.name }))]} />
                    </li>
                  );
                })}
              </ol>
            </div>
          ),
          summary: (
            <ul className="flex flex-col text-sm">
              {transfer.lines.map((l) => {
                const e = entry(l);
                const differs = parseMilli(e.quantity.trim() || "0") !== parseMilli(l.sent);
                return (
                  <li key={l.id}>
                    {w.line(l.name, `${formatQuantity(e.quantity.trim() || "0")} ${unit(l)}`, name(e.productId))}
                    {differs ? <span className="text-warning"> ({w.difference(`${formatQuantity(l.sent)} ${unit(l)}`)})</span> : null}
                  </li>
                );
              })}
            </ul>
          ),
        },
      ]}
    />
  );
}
