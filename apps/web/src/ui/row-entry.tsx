"use client";

// Captura por renglones (spec 002, RF-22, RF-32 y RF-33): cada cantidad se escribe o se sube y baja con menos y más.
import { useId } from "react";
import { parseQuantity, stepQuantity } from "@/domain/quantity";
import { es } from "@/i18n";
import { Icon } from "./icons";

export interface EntryRow {
  id: string;
  label: string;
  unit?: string;
}

export function quantityError(raw: string): string | undefined {
  return parseQuantity(raw).ok ? undefined : es.common.quantityError;
}

export function RowEntry({ rows, values, onChange, headers }: { rows: EntryRow[]; values: Record<string, string>; onChange: (id: string, value: string) => void; headers?: [string, string] }) {
  const t = es.common;
  const base = useId();
  return (
    <div className="flex flex-col">
      {headers ? (
        <div aria-hidden className="flex h-8 items-center justify-between text-xs font-semibold tracking-widest text-ink-muted uppercase">
          <span>{headers[0]}</span>
          <span>{headers[1]}</span>
        </div>
      ) : null}
      <ul className="flex flex-col">
        {rows.map((r) => {
          const value = values[r.id] ?? "0";
          const error = quantityError(value);
          const errorId = `${base}-${r.id}-error`;
          return (
            <li key={r.id} data-entry={r.id} data-invalid={error ? "true" : undefined} className={`flex flex-col gap-1 border-t border-line py-2 ${error ? "border-l-4 border-l-danger pl-3" : ""}`}>
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{r.label}</span>
                  {r.unit ? <span className="text-sm text-ink-muted">{r.unit}</span> : null}
                </div>
                <button type="button" aria-label={t.decrease(r.label)} onClick={() => onChange(r.id, stepQuantity(value, -1))} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink hover:bg-primary-soft">
                  <Icon name="minus" size={18} />
                </button>
                <input
                  aria-label={t.quantityOf(r.label)}
                  inputMode="decimal"
                  autoComplete="off"
                  value={value}
                  onChange={(e) => onChange(r.id, e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  className={`h-11 w-20 min-w-0 shrink rounded-md border bg-surface text-center font-brand text-xl font-bold text-ink ${error ? "border-2 border-danger text-danger" : "border-line-strong"}`}
                />
                <button type="button" aria-label={t.increase(r.label)} onClick={() => onChange(r.id, stepQuantity(value, 1))} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink hover:bg-primary-soft">
                  <Icon name="plus" size={18} />
                </button>
              </div>
              {error ? (
                <p id={errorId} role="alert" className="text-sm font-medium text-danger">
                  {error}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
