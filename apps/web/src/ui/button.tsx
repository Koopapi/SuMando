"use client";

import { useRef, useState, type ButtonHTMLAttributes, type MouseEvent } from "react";
import { es } from "@/i18n";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-primary-soft",
  danger: "bg-danger text-on-danger hover:opacity-90",
  ghost: "bg-transparent text-primary hover:bg-primary-soft",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Ocupado desde fuera (por ejemplo, un formulario que se está enviando). */
  loading?: boolean;
  full?: boolean;
  /** Acción asíncrona: mientras corre, el botón se muestra ocupado y no acepta otro toque (spec 002, RF-26). */
  onAction?: () => Promise<unknown>;
}

/** Botón accesible: nombre por su contenido, estado ocupado con `aria-busy`, objetivo táctil de 44 px (RF-21). */
export function Button({ variant = "primary", loading = false, full = false, className = "", disabled, children, type = "button", onAction, onClick, ...rest }: ButtonProps) {
  const [running, setRunning] = useState(false);
  const pending = useRef(false);
  const busy = loading || running;

  async function handleClick(e: MouseEvent<HTMLButtonElement>) {
    onClick?.(e);
    if (!onAction || pending.current) return;
    pending.current = true;
    setRunning(true);
    try {
      await onAction();
    } finally {
      pending.current = false;
      setRunning(false);
    }
  }

  return (
    <button
      type={type}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      onClick={handleClick}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-4 font-brand text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT[variant]} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {busy ? <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {busy ? es.common.loading : children}
    </button>
  );
}
