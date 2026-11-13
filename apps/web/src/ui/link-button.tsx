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
export function LinkButton({ href, variant = "primary", icon, children, label }: { href: string; variant?: Variant; icon?: IconName; children: ReactNode; label?: string }) {
  return (
    <Link href={href} aria-label={label} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 font-brand text-base font-bold transition ${VARIANT[variant]}`}>
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
    </Link>
  );
}
