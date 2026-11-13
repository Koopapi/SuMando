"use client";

// Spec 007 RF-24 a RF-41, RF-44, RF-45: una requisición con sus grupos por proveedor. El dueño aprueba, rechaza o
// cancela; quien opera anota comprador, marca comprado con importes opcionales, recibe y cierra lo pendiente.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { GroupView, LineView, RequisitionView } from "@/server/services/requisitions/views";
import { Alert, Button, Dialog, LinkButton, MoneyField, NumberField, PageHeader, SectionLabel, StatusBadge, TextArea, TextField, formatDateTime, formatMoney, formatQuantity } from "@/ui";
import { api } from "../api";
import { unitShort } from "../catalog/labels";

const t = es.requisitions;
const STATUS_TONE = { requested: "warning", approved: "neutral", rejected: "danger", cancelled: "danger", closed: "success" } as const;
const GROUP_TONE = { to_buy: "warning", purchased: "neutral", partial: "warning", received: "success" } as const;
const money = (v: string | null) => (v === null ? "—" : formatMoney(Number(v)));
const unitOf = (l: LineView) => l.presentation.name ?? unitShort(l.baseUnit);
const qty = (q: string, l: LineView) => t.qty(formatQuantity(q), unitOf(l));

type Modal =
  | { kind: "reject" | "cancel" }
  | { kind: "purchase"; group: GroupView }
  | { kind: "receive"; group: GroupView }
  | { kind: "close"; group: GroupView }
  | null;

export function RequisitionDetail({ requisition: r }: { requisition: RequisitionView }) {
  const router = useRouter();
  const [modal, setModal] = useState<Modal>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const linesOf = (g: GroupView) => r.lines.filter((l) => g.lineIds.includes(l.id));
  const groupName = (g: GroupView) => (g.supplierName ? (g.supplierArchived ? t.groupArchived(g.supplierName) : g.supplierName) : t.groupNoSupplier);

  async function call(path: string, body: unknown, method = "POST") {
    setBusy(true);
    setError(null);
    const result = await api(path, { method, body });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return false;
    }
    setModal(null);
    router.refresh();
    return true;
  }

  return (
    <>
      <Link href="/requisiciones" className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
        {t.back}
      </Link>
      <PageHeader
        title={t.folio(r.folio)}
        subtitle={t.createdLine(r.warehouse.name, formatDateTime(new Date(r.createdAt)), r.author)}
        action={
          <span className="flex flex-wrap gap-2">
            {r.canDecide ? (
              <Button loading={busy} onClick={() => void call(`/api/requisitions/${r.id}/approve`, {})}>
                {t.approve}
              </Button>
            ) : null}
            {r.canEdit ? (
              <LinkButton href={`/requisiciones/${r.id}/editar`} variant="secondary">
                {t.edit}
              </LinkButton>
            ) : null}
            {r.canDecide ? (
              <Button variant="secondary" onClick={() => setModal({ kind: "reject" })}>
                {t.reject}
              </Button>
            ) : null}
            {r.canCancel ? (
              <Button variant="secondary" onClick={() => setModal({ kind: "cancel" })}>
                {t.cancelReq}
              </Button>
            ) : null}
          </span>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={STATUS_TONE[r.status]}>{t.statuses[r.status]}</StatusBadge>
        {r.total ? <span className="text-sm font-semibold">{t.total(money(r.total))}</span> : null}
      </div>
      {r.note ? <p className="text-sm">{r.note}</p> : null}
      {error && !modal ? <Alert tone="error">{error}</Alert> : null}

      {r.groups.map((g) => {
        const lines = linesOf(g);
        const name = groupName(g);
        return (
          <section key={g.id ?? g.supplierId ?? "none"} aria-label={name} className="flex flex-col gap-3 border-t border-line pt-4" data-testid="req-group">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{name}</h2>
              {r.status !== "requested" ? <StatusBadge tone={GROUP_TONE[g.status]}>{t.groupStatuses[g.status]}</StatusBadge> : null}
              {g.total ? <span className="text-sm font-semibold">{money(g.total)}</span> : null}
            </div>
            {g.purchasedAt ? <p className="text-sm text-ink-muted">{t.purchasedLine(g.purchasedBy ?? "", formatDateTime(new Date(g.purchasedAt)))}</p> : null}
            {r.canOperate && g.id && !g.anyReceived ? <BuyerForm key={g.buyer ?? ""} group={g} name={name} busy={busy} onSave={(buyer) => call(`/api/requisitions/${r.id}/groups/${g.id}`, { buyer }, "PATCH")} /> : g.buyer ? <p className="text-sm">{`${t.buyer}: ${g.buyer}`}</p> : null}
            <ul className="flex flex-col lg:hidden">
              {lines.map((l) => (
                <li key={l.id} className="border-b border-line py-2 text-sm" data-testid="req-line-phone">
                  <span className="flex flex-wrap justify-between gap-x-3">
                    <span className="font-semibold">{l.name}</span>
                    <span className="tabular-nums">{`${t.colApproved}: ${qty(l.quantity, l)}`}</span>
                  </span>
                  <span className="block text-ink-muted tabular-nums">{`${t.colReceived}: ${qty(l.received, l)} · ${t.colPending}: ${l.closed ? "—" : qty(l.pending, l)}${l.amount ? ` · ${money(l.amount)}` : ""}`}</span>
                  {l.quantity !== l.requested ? <span className="block text-ink-muted">{`${t.colRequested}: ${qty(l.requested, l)}`}</span> : null}
                  {l.closed ? <span className="block text-ink-muted">{t.closedLine(l.closed.reason ?? "")}</span> : null}
                  {l.excess !== "0" ? <span className="block text-warning">{t.excess(qty(l.excess, l))}</span> : null}
                </li>
              ))}
            </ul>
            <div className="hidden lg:block">
              <table className="w-full text-left text-sm">
                <thead className="text-xs tracking-widest text-ink-muted uppercase">
                  <tr>
                    <th className="py-2 font-semibold">{t.colProduct}</th>
                    <th className="py-2 text-end font-semibold">{t.colRequested}</th>
                    <th className="py-2 text-end font-semibold">{t.colApproved}</th>
                    <th className="py-2 text-end font-semibold">{t.colReceived}</th>
                    <th className="py-2 text-end font-semibold">{t.colPending}</th>
                    <th className="py-2 text-end font-semibold">{t.colAmount}</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-t border-line" data-testid="req-line">
                      <td className="py-2">
                        <span className="font-semibold">{l.name}</span>
                        {l.closed ? <span className="block text-ink-muted">{t.closedLine(l.closed.reason ?? "")}</span> : null}
                        {l.excess !== "0" ? <span className="block text-warning">{t.excess(qty(l.excess, l))}</span> : null}
                      </td>
                      <td className="py-2 text-end tabular-nums">{qty(l.requested, l)}</td>
                      <td className="py-2 text-end tabular-nums">{qty(l.quantity, l)}</td>
                      <td className="py-2 text-end tabular-nums">{qty(l.received, l)}</td>
                      <td className="py-2 text-end tabular-nums">{l.closed ? "—" : qty(l.pending, l)}</td>
                      <td className="py-2 text-end tabular-nums">{money(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {r.canOperate && g.id ? (
              <div className="flex flex-wrap gap-2">
                {!g.anyReceived ? (
                  <Button variant={g.purchasedAt ? "secondary" : "primary"} onClick={() => setModal({ kind: "purchase", group: g })}>
                    {g.purchasedAt ? t.editAmounts : t.markPurchased}
                  </Button>
                ) : null}
                {g.purchasedAt && g.status !== "received" ? <Button onClick={() => setModal({ kind: "receive", group: g })}>{t.receive}</Button> : null}
                {g.status !== "received" ? (
                  <Button variant="ghost" onClick={() => setModal({ kind: "close", group: g })}>
                    {t.closePending}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}

      <section aria-label={t.history} className="flex flex-col gap-2 border-t border-line pt-4">
        <SectionLabel as="h2">{t.history}</SectionLabel>
        <ol className="flex flex-col gap-1 text-sm" data-testid="req-history">
          {r.events.map((e, i) => (
            <li key={i}>
              {t.eventLine(t.events[e.kind] ?? e.kind, e.actor, formatDateTime(new Date(e.at)))}
              {e.detail?.direct ? ` · ${t.direct}` : ""}
              {Array.isArray(e.detail?.changes) ? ` · ${t.withChanges((e.detail.changes as unknown[]).length)}` : ""}
              {typeof e.detail?.reason === "string" ? ` · ${t.reasonLine(e.detail.reason)}` : ""}
            </li>
          ))}
        </ol>
      </section>

      <ReasonModal open={modal?.kind === "reject"} title={t.rejectTitle} intro={t.rejectIntro} error={error} busy={busy} onClose={() => setModal(null)} onSubmit={(reason) => call(`/api/requisitions/${r.id}/reject`, { reason })} />
      <ReasonModal open={modal?.kind === "cancel"} title={t.cancelTitle} intro={t.cancelIntro} error={error} busy={busy} onClose={() => setModal(null)} onSubmit={(reason) => call(`/api/requisitions/${r.id}/cancel`, { reason })} />
      {modal?.kind === "close" ? (
        <ReasonModal open title={t.closeTitle(groupName(modal.group))} intro={t.closeIntro} error={error} busy={busy} onClose={() => setModal(null)} onSubmit={(reason) => call(`/api/requisitions/${r.id}/close`, { lineIds: modal.group.lineIds, reason })} />
      ) : null}
      {modal?.kind === "purchase" ? <PurchaseModal group={modal.group} name={groupName(modal.group)} lines={linesOf(modal.group)} error={error} busy={busy} onClose={() => setModal(null)} onSubmit={(body) => call(`/api/requisitions/${r.id}/groups/${modal.group.id}`, body, "PATCH")} /> : null}
      {modal?.kind === "receive" ? <ReceiveModal name={groupName(modal.group)} lines={linesOf(modal.group).filter((l) => !l.closed)} error={error} busy={busy} onClose={() => setModal(null)} onSubmit={(lines) => call(`/api/requisitions/${r.id}/receive`, { groupId: modal.group.id, lines })} /> : null}
    </>
  );
}

function BuyerForm({ group, name, busy, onSave }: { group: GroupView; name: string; busy: boolean; onSave: (buyer: string) => Promise<boolean> }) {
  const [buyer, setBuyer] = useState(group.buyer ?? "");
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(buyer);
      }}
    >
      <TextField label={t.buyerOf(name)} className="min-w-0 flex-1 lg:max-w-sm" maxLength={60} value={buyer} onChange={(e) => setBuyer(e.target.value)} />
      <Button type="submit" variant="secondary" loading={busy}>
        {t.saveBuyer}
      </Button>
    </form>
  );
}

function ReasonModal({ open, title, intro, error, busy, onClose, onSubmit }: { open: boolean; title: string; intro: string; error: string | null; busy: boolean; onClose: () => void; onSubmit: (reason: string) => Promise<boolean> }) {
  return (
    <Dialog open={open} title={title} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit(String(new FormData(e.currentTarget).get("reason") ?? ""));
        }}
      >
        <p className="text-sm text-ink-muted">{intro}</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <TextArea label={t.reason} name="reason" rows={2} maxLength={200} hint={t.reasonHint} required />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t.keep}
          </Button>
          <Button type="submit" variant="danger" loading={busy}>
            {t.confirm}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function PurchaseModal({ group, name, lines, error, busy, onClose, onSubmit }: { group: GroupView; name: string; lines: LineView[]; error: string | null; busy: boolean; onClose: () => void; onSubmit: (body: unknown) => Promise<boolean> }) {
  const [total, setTotal] = useState(group.totalFromLines ? "" : (group.total ?? ""));
  const [amounts, setAmounts] = useState<Record<string, string>>(() => Object.fromEntries(lines.map((l) => [l.id, l.amount ?? ""])));
  const byLine = Object.values(amounts).some((a) => a.trim() !== "");
  return (
    <Dialog open title={t.purchaseTitle(name)} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit({ purchased: true, total: byLine ? null : total.trim() || null, amounts: lines.map((l) => ({ lineId: l.id, amount: amounts[l.id].trim() || null })) });
        }}
      >
        <p className="text-sm text-ink-muted">{t.purchaseIntro}</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <MoneyField label={t.groupTotal} value={byLine ? "" : total} disabled={byLine} onChange={(e) => setTotal(e.target.value)} />
        {lines.map((l) => (
          <MoneyField key={l.id} label={t.lineAmount(l.name)} value={amounts[l.id]} onChange={(e) => setAmounts((a) => ({ ...a, [l.id]: e.target.value }))} />
        ))}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t.keep}
          </Button>
          <Button type="submit" loading={busy}>
            {group.purchasedAt ? t.save : t.markPurchased}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ReceiveModal({ name, lines, error, busy, onClose, onSubmit }: { name: string; lines: LineView[]; error: string | null; busy: boolean; onClose: () => void; onSubmit: (lines: unknown) => Promise<boolean> }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(lines.map((l) => [l.id, l.pending])));
  return (
    <Dialog open title={t.receiveTitle(name)} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit(lines.map((l) => ({ lineId: l.id, quantity: values[l.id].trim() || "0", presentationId: l.presentation.id })));
        }}
      >
        <p className="text-sm text-ink-muted">{t.receiveIntro}</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {lines.map((l) => (
          <NumberField key={l.id} label={t.receivedOf(l.name)} hint={`${t.colPending}: ${qty(l.pending, l)}`} trailing={<span className="text-sm text-ink-muted">{unitOf(l)}</span>} value={values[l.id]} onChange={(e) => setValues((v) => ({ ...v, [l.id]: e.target.value }))} />
        ))}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t.keep}
          </Button>
          <Button type="submit" loading={busy}>
            {t.confirmReceive}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
