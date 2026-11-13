"use client";

// Spec 005 RF-60, RF-61, RF-64 a RF-66: un movimiento con lo que cambió, la existencia que dejó y su cancelación.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { MovementView } from "@/server/services/inventory/views";
import { Button, PageHeader, SectionLabel, StatusBadge, formatDateTime } from "@/ui";
import { kindLabel, reasonLabel, withMeasure } from "./labels";
import { ReasonDialog } from "./reason-dialog";

const t = es.inventory;

export function MovementDetail({ movement }: { movement: MovementView }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const m = movement;
  const facts = [
    m.reason ? [t.reason, reasonLabel(m.reason)] : null,
    m.supplier ? [t.supplier, m.supplier] : null,
    m.reference ? [t.reference, m.reference] : null,
    m.note ? [m.kind === "adjustment" || m.kind === "reversal" ? t.reason : t.note, m.note] : null,
  ].filter((x): x is [string, string] => x !== null);
  return (
    <>
      <Link href="/inventario/movimientos" className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
        {t.backMovements}
      </Link>
      <PageHeader
        title={t.movementTitle(kindLabel(m.kind))}
        subtitle={t.movementLine(m.warehouse.name, formatDateTime(new Date(m.createdAt)), m.author)}
        action={
          m.cancellable ? (
            <Button variant="secondary" onClick={() => setCancelling(true)}>
              {t.cancelMovement}
            </Button>
          ) : undefined
        }
      />
      {m.reversal ? (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge tone="danger">{t.cancelled}</StatusBadge>
          {t.cancelledLine(m.reversal.author, formatDateTime(new Date(m.reversal.createdAt)))}
          {m.reversal.reason ? ` · ${t.cancelReasonLine(m.reversal.reason)}` : ""}
          <Link href={`/inventario/movimientos/${m.reversal.id}`} className="font-semibold text-primary">
            {t.viewReversal}
          </Link>
        </p>
      ) : null}
      {m.reverses ? (
        <Link href={`/inventario/movimientos/${m.reverses}`} className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
          {t.viewOriginal}
        </Link>
      ) : null}
      {m.requisition ? (
        <Link href={`/requisiciones/${m.requisition.id}`} className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
          {es.requisitions.folio(m.requisition.folio)}
        </Link>
      ) : null}
      {m.transferId ? (
        <Link href={`/inventario/traspasos/${m.transferId}`} className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
          {t.viewTransfer}
        </Link>
      ) : null}
      {facts.length ? (
        <dl className="flex flex-col gap-2">
          {facts.map(([k, v]) => (
            <div key={k} className="flex flex-wrap items-baseline gap-x-3">
              <dt className="text-sm font-semibold text-ink-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <section aria-label={t.lines} className="flex flex-col gap-2">
        <SectionLabel as="h2">{t.lines}</SectionLabel>
        <table className="w-full text-left">
          <thead className="text-xs tracking-widest text-ink-muted uppercase">
            <tr>
              <th className="py-2 font-semibold">{t.product}</th>
              <th className="py-2 text-end font-semibold">{t.change}</th>
              <th className="py-2 text-end font-semibold">{t.balance}</th>
            </tr>
          </thead>
          <tbody>
            {m.lines.map((l) => (
              <tr key={l.productId} className="border-t border-line" data-testid="movement-line">
                <td className="py-2">
                  <Link href={`/inventario/historial?almacen=${m.warehouse.id}&producto=${l.productId}`} className="font-semibold text-primary hover:underline">
                    {l.name}
                  </Link>
                </td>
                <td className="py-2 text-end tabular-nums">{withMeasure(l.delta.startsWith("-") ? l.delta : `+${l.delta}`, l)}</td>
                <td className={`py-2 text-end tabular-nums ${l.balance.startsWith("-") ? "font-semibold text-danger" : ""}`}>{withMeasure(l.balance, l)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <ReasonDialog
        open={cancelling}
        title={t.cancelMovementTitle}
        intro={t.cancelMovementIntro}
        path={`/api/inventory/movements/${m.id}/cancel`}
        onClose={() => setCancelling(false)}
        onDone={() => {
          setCancelling(false);
          router.refresh();
        }}
      />
    </>
  );
}
