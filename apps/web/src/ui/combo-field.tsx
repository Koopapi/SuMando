"use client";

// Campo con búsqueda (spec 013, RF-29): se escribe parte del nombre y se elige de una lista filtrada sin acentos ni
// mayúsculas. Patrón «combobox» de ARIA: flechas para moverse, Enter para elegir, Escape para cerrar.
import { useId, useMemo, useRef, useState } from "react";
import { filterOptions } from "@/domain/search";
import { es } from "@/i18n";
import { Icon } from "./icons";

export interface ComboOption {
  value: string;
  label: string;
  /** Texto secundario en la lista (por ejemplo, el proveedor). */
  hint?: string;
}

export interface ComboFieldProps {
  label: string;
  options: ComboOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hideLabel?: boolean;
  error?: string;
  className?: string;
  /** Cuántas opciones se muestran a la vez. */
  limit?: number;
}

export function ComboField({ label, options, value, onChange, placeholder, hideLabel = false, error, className = "", limit = 50 }: ComboFieldProps) {
  const id = useId();
  const listId = `${id}-list`;
  const errorId = error ? `${id}-error` : undefined;
  const selected = options.find((o) => o.value === value);
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const shown = useMemo(() => filterOptions(options, query ?? "", limit), [options, query, limit]);

  function choose(o: ComboOption) {
    onChange(o.value);
    setQuery(null);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (shown[active]) choose(shown[active]);
    } else if (e.key === "Escape") {
      setQuery(null);
      setOpen(false);
    }
  }

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-semibold text-ink"}>
        {label}
      </label>
      <div className={`flex min-h-12 items-center gap-2 rounded-md border bg-surface px-3.5 focus-within:border-primary ${error ? "border-2 border-danger" : "border-line-strong"}`}>
        <Icon name="search" size={18} className="shrink-0 text-ink-muted" />
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && shown[active] ? `${id}-opt-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          autoComplete="off"
          placeholder={placeholder}
          className="min-h-11 w-full min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-muted focus:outline-none"
          value={query ?? selected?.label ?? ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={(e) => {
            e.currentTarget.select();
            setOpen(true);
          }}
          onBlur={() => {
            // Deja terminar el clic en una opción antes de cerrar.
            setTimeout(() => {
              setOpen(false);
              setQuery(null);
            }, 150);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {open ? (
        <ul id={listId} role="listbox" aria-label={label} className="absolute top-full z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-line-strong bg-surface py-1 shadow-lg">
          {shown.length === 0 ? (
            <li className="px-3.5 py-2.5 text-sm text-ink-muted">{es.common.noOptions}</li>
          ) : (
            shown.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={o.value === value}
                className={`flex min-h-11 cursor-pointer flex-col justify-center px-3.5 py-1.5 ${i === active ? "bg-primary-soft" : ""} ${o.value === value ? "font-semibold" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o)}
              >
                <span className="text-base text-ink">{o.label}</span>
                {o.hint ? <span className="text-sm text-ink-muted">{o.hint}</span> : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
