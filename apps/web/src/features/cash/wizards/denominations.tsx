"use client";

// El paso «Efectivo por denominación» de los asistentes del corte (spec 015, RF-41 y RF-50): piezas de cada billete y
// moneda con + y −, y la suma de lo que se lleva contado (nunca lo que espera el sistema).
import { DENOMINATIONS } from "@/domain/payroll/cash";
import { es } from "@/i18n";
import { Icon, IconButton, NumberField, formatMoney } from "@/ui";

const t = es.cash;
export const pesos = (cents: bigint) => formatMoney(Number(cents) / 100);

export const piecesTotal = (pieces: Record<string, number>) => DENOMINATIONS.reduce((a, x) => a + x.cents * BigInt(pieces[x.cents.toString()] ?? 0), 0n);
export const piecesCount = (pieces: Record<string, number>) => Object.values(pieces).reduce((a, n) => a + (n || 0), 0);

export function DenominationCount({ pieces, onChange }: { pieces: Record<string, number>; onChange: (pieces: Record<string, number>) => void }) {
  const setCount = (key: string, n: number) => onChange({ ...pieces, [key]: Math.max(0, Math.floor(Number.isFinite(n) ? n : 0)) });
  return (
    <>
      <ul className="flex flex-col">
        {DENOMINATIONS.map((x) => {
          const key = x.cents.toString();
          const label = t.denomination(pesos(x.cents), x.kind);
          const n = pieces[key] ?? 0;
          return (
            <li key={key} className="flex items-end gap-2 border-b border-line py-2">
              <NumberField label={label} value={n ? String(n) : ""} onChange={(e) => setCount(key, Number(e.target.value))} className="min-w-0 flex-1" />
              <IconButton label={t.less(label)} onClick={() => setCount(key, n - 1)}>
                <Icon name="minus" />
              </IconButton>
              <IconButton label={t.more(label)} onClick={() => setCount(key, n + 1)}>
                <Icon name="plus" />
              </IconButton>
            </li>
          );
        })}
      </ul>
      <p className="font-brand text-xl font-bold tabular-nums" data-testid="cash-counted-total">
        {t.cashCounted}: {pesos(piecesTotal(pieces))}
      </p>
    </>
  );
}
