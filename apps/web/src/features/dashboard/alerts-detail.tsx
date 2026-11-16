"use client";

// Alertas del tablero (spec 012, RF-37 a RF-46, RF-50): agrupadas por tipo; cada una activa su negocio y sucursal y
// abre la pantalla de su módulo.
import { useState } from "react";
import { addDays } from "@/domain/payroll/week";
import { es } from "@/i18n";
import type { AlertKind, AlertsDetail, AlertView } from "@/server/services/reports/alerts";
import { Alert, EmptyState, Icon, SectionLabel, formatQuantity, type IconName } from "@/ui";
import { api } from "../api";
import { showDate } from "../personnel/dates";
import { amountText } from "./figure";

const t = es.dashboard;
const KINDS: AlertKind[] = ["low_stock", "requisition", "payroll", "cash_difference"];
const ICON: Record<AlertKind, IconName> = { low_stock: "layers", requisition: "cart", payroll: "idcard", cash_difference: "cash" };

function texts(a: AlertView): { title: string; detail: string } {
  switch (a.kind) {
    case "low_stock":
      return { title: t.lowStockTitle(a.product, a.warehouse), detail: t.lowStockDetail(formatQuantity(a.quantity), formatQuantity(a.min), a.presentation ?? es.catalog.unitShort[a.baseUnit]) };
    case "requisition":
      return { title: t.requisitionTitle(a.folio), detail: t.requisitionDetail(a.status, showDate(a.date)) };
    case "payroll":
      return { title: t.payrollTitle(showDate(a.weekStart), showDate(addDays(a.weekStart, 6))), detail: t.payrollDetail };
    case "cash_difference":
      return { title: t.cashTitle(showDate(a.date)), detail: t.cashDetail(amountText(a.difference)) };
  }
}

export function AlertsDetailView({ alerts }: { alerts: AlertsDetail }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (alerts.total === 0) return <EmptyState title={t.allClear} description={t.allClearDescription} />;

  async function open(a: AlertView) {
    setBusy(a.id);
    setError(null);
    const r = await api("/api/session/branch", { method: "PUT", body: { branchId: a.targetBranchId } });
    if (!r.ok) {
      setBusy(null);
      setError(r.error.message);
      return;
    }
    // Carga completa: cambia la sucursal activa y nada de la anterior debe quedar en la caché del cliente (RF-46).
    window.location.assign(a.href);
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {KINDS.filter((k) => alerts.counts[k] > 0).map((k) => (
        <div key={k} className="flex flex-col" data-testid={`alerts-${k}`}>
          <SectionLabel as="h3">{`${t.alertKinds[k]} · ${alerts.counts[k]}`}</SectionLabel>
          <ul className="flex flex-col">
            {alerts.items
              .filter((a) => a.kind === k)
              .map((a) => {
                const { title, detail } = texts(a);
                const danger = (a.kind === "low_stock" && a.negative) || a.kind === "cash_difference";
                return (
                  <li key={a.id} className={`biz-${a.color} border-b border-line`} data-business-color={a.color}>
                    <button type="button" onClick={() => void open(a)} disabled={busy !== null} aria-busy={busy === a.id} className="flex min-h-16 w-full min-w-0 items-center gap-3 py-2 text-left hover:bg-primary-soft disabled:opacity-60 lg:px-2">
                      <Icon name={ICON[k]} size={22} className={danger ? "text-danger" : "text-warning"} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-semibold">{title}</span>
                        <span className={`text-sm ${danger ? "text-danger" : "text-ink-muted"}`}>{detail}</span>
                        <span className="flex items-center gap-1.5 text-sm text-ink-muted">
                          <span aria-hidden className="size-2 shrink-0 rounded-full bg-biz" />
                          {t.placeLine(a.business, a.branch)}
                        </span>
                      </span>
                      <Icon name="chevronRight" className="text-ink-muted" />
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}
