"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { es } from "@/i18n";

/** Diálogo modal sobre `<dialog>` nativo: foco atrapado, Escape cierra, botón de cerrar con nombre. */
export function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[min(100%-2rem,28rem)] rounded-lg border border-line bg-surface-raised p-0 text-ink shadow-xl backdrop:bg-black/40"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="dialog-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button type="button" aria-label={es.common.close} onClick={onClose} className="min-h-9 min-w-9 rounded-md text-ink-muted hover:bg-brand-50">
            ×
          </button>
        </div>
        {open ? children : null}
      </div>
    </dialog>
  );
}
