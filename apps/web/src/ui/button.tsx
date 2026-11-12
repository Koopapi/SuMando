import type { ButtonHTMLAttributes } from "react";
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
