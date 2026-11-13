"use client";

// Spec 005 RF-29 a RF-37: detalle del traspaso; quien recibe confirma lo que llegó y en qué producto entra, quien
// envía puede cancelarlo mientras está en camino (o uno interno hecho).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { ProductOption, TransferView } from "@/server/services/inventory/views";
import { Alert, Button, NumberField, PageHeader, SectionLabel, SelectField, StatusBadge, formatDateTime, formatQuantity } from "@/ui";
import { api } from "../api";
import { unitShort } from "../catalog/labels";
import { ReasonDialog } from "./reason-dialog";

const t = es.inventory;

export function TransferDetail({ transfer, products }: { transfer: TransferView; products: ProductOption[] }) {
  const router = useRouter();
  const [values, setValues] = useState(() => Object.fromEntries(transfer.lines.map((l) => [l.id, { productId: l.proposedProductId ?? "", quantity: l.sent }])));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const fmt = (iso: string | null) => (iso ? formatDateTime(new Date(iso)) : "");
  const tone = transfer.status === "in_transit" ? "warning" : transfer.status === "cancelled" ? "danger" : "success";

  async function receive() {
    setBusy(true);
    setError(null);
    const lines = transfer.lines.map((l) => ({ lineId: l.id, productId: values[l.id].productId || null, quantity: values[l.id].quantity }));
    const result = await api(`/api/inventory/transfers/${transfer.id}/receive`, { body: { lines } });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.refresh();
  }

  const from = transfer.crossBusiness ? `${transfer.from.business} · ${transfer.from.warehouse}` : transfer.from.warehouse;
  const to = transfer.crossBusiness ? `${transfer.to.business} · ${transfer.to.warehouse}` : transfer.to.warehouse;
  return (
    <>
      <Link href="/inventario/traspasos" className="inline-flex min-h-11 items-center gap-1 self-start font-semibold text-primary">
        {t.backTransfers}
      </Link>
      <PageHeader
        title={t.transferTitleOf(from, to)}
        subtitle={t.sentBy(transfer.sentBy, fmt(transfer.sentAt))}
        action={
          transfer.canCancel ? (
            <Button variant="secondary" onClick={() => setCancelling(true)}>
              {t.cancelTransfer}
            </Button>
          ) : undefined
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={tone}>{t.statuses[transfer.status]}</StatusBadge>
        {transfer.hasDifference ? <StatusBadge tone="danger">{t.withDifference}</StatusBadge> : null}
      </div>
      {transfer.receivedAt ? <p className="text-sm text-ink-muted">{t.receivedBy(transfer.receivedBy ?? "", fmt(transfer.receivedAt))}</p> : null}
      {transfer.cancelledAt ? (
        <p className="text-sm text-ink-muted">
          {t.cancelledBy(transfer.cancelledBy ?? "", fmt(transfer.cancelledAt))} · {t.cancelReasonLine(transfer.cancelReason ?? "")}
        </p>
      ) : null}
      {transfer.note ? <p className="text-sm">{transfer.note}</p> : null}

      {transfer.canReceive ? (
        <section aria-label={t.receiveTitle} className="flex flex-col gap-3">
          <SectionLabel as="h2">{t.receiveTitle}</SectionLabel>
          <p className="text-sm text-ink-muted">{t.receiveIntro}</p>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <ol className="flex flex-col">
            {transfer.lines.map((l) => {
              const v = values[l.id];
              const same = products.filter((p) => p.baseUnit === l.baseUnit);
              return (
                <li key={l.id} className="border-t border-line py-3">
                  <fieldset className="grid gap-3 lg:grid-cols-12 lg:items-start">
                    <legend className="mb-2 font-semibold lg:col-span-12">
                      {l.name} · {t.sent} {formatQuantity(l.sent)} {unitShort(l.baseUnit)}
                    </legend>
                    <SelectField
                      label={t.receiveInto}
                      className="lg:col-span-7"
                      value={v.productId}
                      onChange={(e) => setValues((s) => ({ ...s, [l.id]: { ...v, productId: e.target.value } }))}
                      options={[{ value: "", label: t.chooseProduct }, ...same.map((p) => ({ value: p.id, label: p.name }))]}
                    />
                    <NumberField label={t.receivedQuantity(unitShort(l.baseUnit))} className="lg:col-span-5" value={v.quantity} onChange={(e) => setValues((s) => ({ ...s, [l.id]: { ...v, quantity: e.target.value } }))} />
                  </fieldset>
                </li>
              );
            })}
          </ol>
          <div className="flex justify-end">
            <Button loading={busy} onClick={() => void receive()}>
              {t.confirmReceive}
            </Button>
          </div>
        </section>
      ) : (
        <section aria-label={t.lines} className="flex flex-col gap-2">
          <SectionLabel as="h2">{t.lines}</SectionLabel>
          <table className="w-full text-left">
            <thead className="text-xs tracking-widest text-ink-muted uppercase">
              <tr>
                <th className="py-2 font-semibold">{t.product}</th>
                <th className="py-2 text-end font-semibold">{t.sent}</th>
                <th className="py-2 text-end font-semibold">{t.received}</th>
                <th className="py-2 text-end font-semibold">{t.difference}</th>
              </tr>
            </thead>
            <tbody>
              {transfer.lines.map((l) => (
                <tr key={l.id} className="border-t border-line" data-testid="transfer-line">
                  <td className="py-2">
                    {l.name}
                    {l.toProduct && l.toProduct.name !== l.name ? <span className="block text-sm text-ink-muted">{`${t.receiveInto}: ${l.toProduct.name}`}</span> : null}
                  </td>
                  <td className="py-2 text-end tabular-nums">{`${formatQuantity(l.sent)} ${unitShort(l.baseUnit)}`}</td>
                  <td className="py-2 text-end tabular-nums">{l.received === null ? "—" : `${formatQuantity(l.received)} ${unitShort(l.baseUnit)}`}</td>
                  <td className={`py-2 text-end tabular-nums ${l.difference && l.difference !== "0" ? "font-semibold text-danger" : ""}`}>{l.difference === null ? "—" : formatQuantity(l.difference)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <ReasonDialog
        open={cancelling}
        title={t.cancelTransferTitle}
        intro={t.cancelTransferIntro}
        path={`/api/inventory/transfers/${transfer.id}/cancel`}
        onClose={() => setCancelling(false)}
        onDone={() => {
          setCancelling(false);
          router.refresh();
        }}
      />
    </>
  );
}
