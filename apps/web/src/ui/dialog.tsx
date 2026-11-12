"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { es } from "@/i18n";
import { Icon } from "./icons";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Mantiene Tab y Mayús+Tab dentro del contenedor (RF-37). */
export function trapTab(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== "Tab") return;
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !e.currentTarget.contains(active))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || !e.currentTarget.contains(active))) {
    e.preventDefault();
    first.focus();
  }
}

/** Abre o cierra un `<dialog>` nativo como modal según `open`. */
export function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return ref;
}

/** Diálogo modal sobre `<dialog>` nativo: el resto de la página queda inerte, Escape cierra, el foco no sale (RF-37). */
export function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useModal(open);
  const titleId = useId();
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onKeyDown={trapTab}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[min(100%-2rem,28rem)] rounded-lg border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-scrim"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="pt-2 font-brand text-xl font-bold">
            {title}
          </h2>
          <button type="button" aria-label={es.common.close} onClick={onClose} className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-primary-soft">
            <Icon name="close" />
          </button>
        </div>
        {open ? children : null}
      </div>
    </dialog>
  );
}

/** Panel lateral sobre `<dialog>`: el menú de navegación en teléfono (RF-16). Fondo azul de la banda. */
export function Sheet({ open, label, onClose, children }: { open: boolean; label: string; onClose: () => void; children: ReactNode }) {
  const ref = useModal(open);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onKeyDown={trapTab}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-0 ml-auto h-dvh max-h-none w-[min(100%-3rem,20rem)] bg-band p-0 text-on-band backdrop:bg-scrim"
    >
      <div className="flex h-full flex-col gap-2 p-4">
        <div className="flex justify-end">
          <button type="button" aria-label={es.common.close} onClick={onClose} className="inline-flex size-11 items-center justify-center rounded-md border border-band-line hover:bg-band-pill">
            <Icon name="close" />
          </button>
        </div>
        {open ? children : null}
      </div>
    </dialog>
  );
}
