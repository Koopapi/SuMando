"use client";

// Renglón de captura compacto (spec 014, RF-20 y RF-21): cerrado es una sola franja con lo capturado; al tocarlo se
// abren sus campos. Quien lo usa decide cuál está abierto (uno a la vez).
import type { ReactNode } from "react";
import { es } from "@/i18n";
import { Button } from "./button";
import { Icon } from "./icons";

export interface CaptureRowProps {
  /** Nombre del renglón para lectores de pantalla («Producto 3»). */
  label: string;
  /** Lo capturado: producto, cantidad con su presentación y, si aplica, proveedor. */
  summary: string;
  /** Dato secundario en la franja (existencias, avisos). */
  detail?: ReactNode;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  children: ReactNode;
}

export function CaptureRow({ label, summary, detail, open, onOpen, onClose, onRemove, removeLabel, children }: CaptureRowProps) {
  const t = es.common;
  return (
    <fieldset className="border-b border-line" data-capture-row={open ? "open" : "closed"}>
      <legend className="sr-only">{label}</legend>
      {open ? (
        <div className="flex flex-col gap-3 py-3">
          {children}
          <div className="flex items-center justify-end gap-2">
            {onRemove ? (
              <Button variant="ghost" aria-label={removeLabel} onClick={onRemove}>
                <Icon name="trash" size={18} />
                {t.remove}
              </Button>
            ) : null}
            <Button variant="secondary" onClick={onClose}>
              {t.done}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-12 items-center gap-2">
          <button type="button" aria-expanded={false} onClick={onOpen} className="flex min-h-12 min-w-0 flex-1 flex-col justify-center py-1.5 text-left hover:bg-primary-soft lg:flex-row lg:items-center lg:gap-4">
            <span className="truncate font-semibold">
              <span className="sr-only">{t.editLinePrefix(label)}</span>
              {summary}
            </span>
            {detail ? <span className="truncate text-sm text-ink-muted tabular-nums lg:ml-auto">{detail}</span> : null}
          </button>
          {onRemove ? (
            <button type="button" aria-label={removeLabel} onClick={onRemove} className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-primary-soft hover:text-danger">
              <Icon name="trash" size={18} />
            </button>
          ) : null}
        </div>
      )}
    </fieldset>
  );
}
