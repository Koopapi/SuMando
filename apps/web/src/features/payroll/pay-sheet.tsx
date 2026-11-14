// Spec 009 RF-41 a RF-44: hoja de pago con un bloque por empleado (desglose, neto, billetes y firma) y el efectivo
// a preparar para toda la semana. Solo la ve el dueño.
import Link from "next/link";
import { DENOMINATIONS, type Breakdown } from "@/domain/payroll/cash";
import { es } from "@/i18n";
import type { PayrollRowView } from "@/server/services/payroll/views";
import { PageHeader, SectionLabel, formatMoney } from "@/ui";
import { showDate } from "../personnel/dates";
import { PrintButton } from "./print-button";

const t = es.payroll;
const money = (text: string) => formatMoney(Number(text));
const pesos = (cents: bigint) => formatMoney(Number(cents) / 100);
const kindOf = (cents: bigint) => DENOMINATIONS.find((d) => d.cents === cents)?.kind ?? "coin";

function Cash({ cash, testId }: { cash: { pieces: { cents: string; count: number }[]; leftover: string }; testId: string }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums" data-testid={testId}>
      {cash.pieces.map((p) => (
        <li key={p.cents}>
          {t.denomination(pesos(BigInt(p.cents)), kindOf(BigInt(p.cents)))} {t.pieces(p.count)}
        </li>
      ))}
      {cash.leftover !== "0" ? <li>{t.paySheetLeftover(pesos(BigInt(cash.leftover)))}</li> : null}
    </ul>
  );
}

export const serialCash = (b: Breakdown) => ({ pieces: b.pieces.map((p) => ({ cents: p.cents.toString(), count: p.count })), leftover: b.leftoverCents.toString() });

export function PaySheet({ start, end, total, rows, cash, totalCash }: { start: string; end: string; total: string; rows: PayrollRowView[]; cash: Record<string, ReturnType<typeof serialCash>>; totalCash: ReturnType<typeof serialCash> }) {
  return (
    <>
      <Link href={`/nomina/${start}`} className="inline-flex min-h-11 items-center self-start font-semibold text-primary print:hidden">
        {t.back}
      </Link>
      <PageHeader title={t.paySheetTitle(showDate(start), showDate(end))} figure={money(total)} figureLabel={t.total} action={<PrintButton />} />
      <section aria-label={t.paySheetCash} className="flex flex-col gap-2">
        <SectionLabel as="h2">{t.paySheetCash}</SectionLabel>
        <Cash cash={totalCash} testId="pay-sheet-total-cash" />
      </section>
      <ul className="flex flex-col">
        {rows.map((r) => {
          const m = r.money!;
          return (
            <li key={r.employeeId} className="flex break-inside-avoid flex-col gap-2 border-b border-line py-4" data-testid="pay-sheet-person">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="min-w-0 flex-1 font-brand text-lg font-bold">{r.name}</span>
                <span className="text-sm text-ink-muted">{r.position}</span>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm tabular-nums lg:grid-cols-4">
                {(
                  [
                    [t.daysAmount, m.days],
                    [t.extras, m.extras],
                    [m.bonusConcept ? `${t.bonus} (${m.bonusConcept})` : t.bonus, m.bonus],
                    [t.late, m.late],
                    [t.meal, m.meal],
                    [t.loans, m.loans],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-2">
                    <dt className="text-ink-muted">{label}</dt>
                    <dd>{money(value)}</dd>
                  </div>
                ))}
              </dl>
              <p className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{t.net}</span>
                <span className="font-brand text-xl font-bold tabular-nums" data-testid="pay-sheet-net">
                  {money(m.net)}
                </span>
              </p>
              <Cash cash={cash[r.employeeId]} testId="pay-sheet-cash" />
              <p className="mt-6 border-t border-ink pt-1 text-sm text-ink-muted lg:w-80">{t.signature}</p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
