"use client";

// Grupo plegable de una lista (spec 014, RF-14 y RF-15): título con su cuenta y botón para abrir o cerrar.
import { useState, type ReactNode } from "react";
import { es } from "@/i18n";
import { Icon } from "./icons";

export function CollapsibleGroup({ label, count, defaultOpen = true, children }: { label: string; count: number; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section aria-label={label} data-group={label} className="flex flex-col">
      <h2 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-11 w-full items-center gap-2 border-b border-line bg-page px-1 text-left font-brand font-bold"
        >
          <Icon name={open ? "chevronDown" : "chevronRight"} size={18} className="text-ink-muted" />
          <span className="flex-1">
            {label}
          </span>
          <span className="text-sm font-semibold text-ink-muted tabular-nums">
            {count}
            <span className="sr-only">{es.common.rowsWord(count)}</span>
          </span>
        </button>
      </h2>
      {open ? children : null}
    </section>
  );
}
