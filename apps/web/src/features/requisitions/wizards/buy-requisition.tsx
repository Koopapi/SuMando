"use client";

// Asistente «Comprar» (spec 015, RF-31): Quién compra y un paso por proveedor de su lista (se compró y cuánto se
// pagó), y Resumen. Marca cada proveedor con la misma ruta que la pantalla completa
// (`PATCH /api/requisitions/[id]/groups/[groupId]`).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { nextAfter } from "@/domain/wizards/next";
import { es } from "@/i18n";
import type { GroupView, RequisitionView } from "@/server/services/requisitions/views";
import { Alert, Checkbox, LinkButton, LoadingState, MoneyField, ResumePrompt, SelectField, Wizard, formatMoney, formatQuantity } from "@/ui";
import { api } from "../../api";
import { unitShort } from "../../catalog/labels";
import { useWizardDraft } from "../../wizards/use-wizard-draft";
import { switchView } from "../../wizards/view-switch";

const t = es.requisitions;
const w = t.buyWizard;

interface BuyDraft {
  buyer: string;
  groups: Record<string, { bought: boolean; total: string }>;
}

const NONE = "none";
const open = (g: GroupView) => !!g.id && !g.purchasedAt && !g.anyReceived;

export function BuyRequisitionWizard({ requisition: r, autoResume }: { requisition: RequisitionView; autoResume: boolean }) {
  const router = useRouter();
  const buyers = r.buyers.filter((b) => r.groups.some((g) => g.id && b.groupIds.includes(g.id) && open(g)));
  const initial: BuyDraft = { buyer: buyers.length === 1 ? (buyers[0].key ?? NONE) : "", groups: {} };
  const [steps, setSteps] = useState<string[]>(() => ["buyer"]);
  const draft = useWizardDraft({ kind: "req-buy", target: r.id, initial, steps, autoResume });
  const d = draft.data;
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const buyer = buyers.find((b) => (b.key ?? NONE) === d.buyer);
  const groups = buyer ? r.groups.filter((g) => g.id && buyer.groupIds.includes(g.id) && open(g)) : [];
  const wanted = ["buyer", ...groups.map((g) => g.id!)];
  if (wanted.join() !== steps.join()) setSteps(wanted);
  const entry = (g: GroupView) => d.groups[g.id!] ?? { bought: false, total: "" };
  const setEntry = (g: GroupView, patch: Partial<{ bought: boolean; total: string }>) => draft.update((x) => ({ ...x, groups: { ...x.groups, [g.id!]: { ...entry(g), ...patch } } }));
  const bought = groups.filter((g) => entry(g).bought);
  const name = (g: GroupView) => g.supplierName ?? t.groupNoSupplier;
  const go = (i: number) => {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  };

  if (done !== null) {
    const next = nextAfter("req-buy", { id: r.id });
    return (
      <div className="flex flex-col gap-4" data-testid="wizard-done">
        <Alert tone="success">{w.done(done)}</Alert>
        <div>
          <LinkButton href={next.href}>{es.common.then[next.key]}</LinkButton>
        </div>
      </div>
    );
  }
  if (!buyers.length)
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
  if (draft.prompt) return <ResumePrompt updatedAt={draft.prompt.updatedAt} stepTitle={draft.prompt.step === "buyer" ? w.steps.buyer : name(r.groups.find((g) => g.id === draft.prompt!.step) ?? r.groups[0])} onContinue={draft.resume} onRestart={() => void draft.restart()} />;

  async function confirm() {
    setBusy(true);
    setError(null);
    let count = 0;
    for (const g of bought) {
      const e = entry(g);
      const result = await api(`/api/requisitions/${r.id}/groups/${g.id}`, { method: "PATCH", body: { purchased: true, total: e.total.trim() || null } });
      if (!result.ok) {
        setBusy(false);
        // RF-10: el proveedor que falló vuelve a su paso; los anteriores ya quedaron marcados.
        go(wanted.indexOf(g.id!));
        setStepError(result.error.message);
        return;
      }
      count++;
    }
    setBusy(false);
    await draft.discard();
    setDone(count);
  }

  const money = (raw: string) => (raw.trim() && !Number.isNaN(Number(raw)) ? formatMoney(Number(raw)) : null);
  return (
    <Wizard
      dirty={bought.length > 0}
      saved
      index={draft.index}
      onIndexChange={go}
      onExit={() => router.push(`/requisiciones/${r.id}`)}
      onFullView={() => void switchView("req-buy", "full", draft.save).then(() => router.push(`/requisiciones/${r.id}`))}
      onFinish={() => void confirm()}
      review={{ confirmLabel: w.confirm, busy, canConfirm: bought.length > 0, extra: error ? <Alert tone="error">{error}</Alert> : !bought.length ? <Alert tone="warning">{w.nothing}</Alert> : null }}
      steps={[
        {
          id: "buyer",
          title: w.steps.buyer,
          hint: w.hints.buyer,
          example: buyers[0]?.name ?? undefined,
          validate: () => (d.buyer ? true : (setStepError(w.chooseBuyer), false)),
          content: (
            <div className="flex flex-col gap-3">
              {stepError ? <Alert tone="error">{stepError}</Alert> : null}
              <SelectField label={w.buyerLabel} value={d.buyer} onChange={(e) => draft.update((x) => ({ ...x, buyer: e.target.value }))} options={[{ value: "", label: w.chooseBuyer }, ...buyers.map((b) => ({ value: b.key ?? NONE, label: b.name ?? t.noBuyer }))]} />
            </div>
          ),
          summary: buyer ? (buyer.name ?? t.noBuyer) : "",
        },
        ...groups.map((g) => {
          const e = entry(g);
          const lines = r.lines.filter((l) => g.lineIds.includes(l.id));
          return {
            id: g.id!,
            title: name(g),
            hint: w.hints.supplier,
            example: w.example,
            content: (
              <div className="flex flex-col gap-3">
                {stepError ? <Alert tone="error">{stepError}</Alert> : null}
                <ul className="flex flex-col text-sm">
                  {lines.map((l) => (
                    <li key={l.id} className="flex justify-between gap-3 border-b border-line py-2">
                      <span className="min-w-0 truncate font-semibold">{l.name}</span>
                      <span className="shrink-0 tabular-nums">{t.qty(formatQuantity(l.pending), l.presentation.name ?? unitShort(l.baseUnit))}</span>
                    </li>
                  ))}
                </ul>
                <Checkbox label={w.bought(name(g))} checked={e.bought} onChange={(ev) => setEntry(g, { bought: ev.target.checked })} />
                {e.bought ? <MoneyField label={w.total} value={e.total} onChange={(ev) => setEntry(g, { total: ev.target.value })} /> : null}
              </div>
            ),
            summary: e.bought ? w.summaryBought(money(e.total)) : w.summaryNot,
          };
        }),
      ]}
    />
  );
}
