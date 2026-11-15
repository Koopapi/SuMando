// Monto con su comparación contra el periodo anterior (spec 012, RF-19, RF-20, RF-36).
import { es } from "@/i18n";
import type { Figure } from "@/server/services/reports/figures";
import { Icon, formatMoney } from "@/ui";

const t = es.dashboard;
const abs = (x: string) => (x.startsWith("-") ? x.slice(1) : x);

export const amountText = (x: string) => formatMoney(Number(x));

export function Amount({ value, size = "base" }: { value: string; size?: "base" | "large" }) {
  const negative = value.startsWith("-");
  return <span className={`font-brand font-bold tabular-nums ${size === "large" ? "text-2xl" : "text-lg"} ${negative ? "text-danger" : ""}`}>{amountText(value)}</span>;
}

export function Change({ figure }: { figure: Figure }) {
  const icon = figure.direction === "up" ? "chevronUp" : figure.direction === "down" ? "chevronDown" : "minus";
  return (
    <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
      <Icon name={icon} size={16} />
      {t.changeLabel(amountText(abs(figure.change)), figure.percent, figure.direction)}
    </span>
  );
}
