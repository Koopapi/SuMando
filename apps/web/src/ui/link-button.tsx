import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-primary-soft",
  ghost: "bg-transparent text-primary hover:bg-primary-soft",
};

/** Enlace con aspecto de botón (spec 004: «Nueva receta», «Usar como base»): navega, no ejecuta acciones. */
export function LinkButton({ href, variant = "primary", icon, children, label, external = false }: { href: string; variant?: Variant; icon?: IconName; children: ReactNode; label?: string; external?: boolean }) {
  const className = `inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 font-brand text-base font-bold transition ${VARIANT[variant]}`;
  // Spec 013, RF-12: un enlace a otra aplicación (WhatsApp) se abre fuera de SuMando.
  if (external)
    return (
      <a href={href} aria-label={label} target="_blank" rel="noopener noreferrer" className={className}>
        {icon ? <Icon name={icon} size={18} /> : null}
        {children}
      </a>
    );
  return (
    <Link href={href} aria-label={label} className={className}>
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
    </Link>
  );
}
