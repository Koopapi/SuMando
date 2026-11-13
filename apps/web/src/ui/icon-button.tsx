import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Botón de solo icono: 44 × 44 px (RF-21) y nombre obligatorio para lectores de pantalla. */
export function IconButton({ label, children, tone = "surface", className = "", type = "button", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode; tone?: "surface" | "band" | "plain" }) {
  const TONE = {
    surface: "border border-line-strong bg-surface text-ink hover:bg-primary-soft",
    band: "border border-band-line text-on-band hover:bg-band-pill",
    plain: "text-ink-muted hover:bg-primary-soft",
  };
  return (
    <button type={type} aria-label={label} title={label} className={`inline-flex size-11 shrink-0 items-center justify-center rounded-md ${TONE[tone]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
