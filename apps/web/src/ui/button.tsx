import type { ButtonHTMLAttributes } from "react";
import { es } from "@/i18n";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 focus-visible:outline-brand-700",
  secondary: "bg-surface-raised text-ink border border-line hover:bg-brand-50 focus-visible:outline-brand-700",
  danger: "bg-danger-600 text-white hover:bg-danger-700 focus-visible:outline-danger-600",
  ghost: "bg-transparent text-brand-700 hover:bg-brand-50 focus-visible:outline-brand-700",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  full?: boolean;
}

/** Botón accesible: nombre por su contenido, estado cargando con `aria-busy`, objetivo táctil de 44 px. */
export function Button({ variant = "primary", loading = false, full = false, className = "", disabled, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-base font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT[variant]} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {loading ? es.common.loading : children}
    </button>
  );
}
