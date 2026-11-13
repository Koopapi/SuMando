"use client";

import Link from "next/link";
import { Icon, type IconName } from "./icons";

export interface BottomNavItem {
  href: string;
  label: string;
  icon: IconName;
  current: boolean;
}

const cell = (current: boolean) =>
  `flex h-full w-full flex-col items-center justify-center gap-1 rounded-md px-0.5 text-[0.6875rem] leading-none ${current ? "font-bold text-primary" : "font-medium text-ink-muted hover:text-ink"}`;

function Mark({ icon, current }: { icon: IconName; current: boolean }) {
  return (
    <span aria-hidden className={`inline-flex h-7 w-12 items-center justify-center rounded-full ${current ? "bg-primary-soft" : ""}`}>
      <Icon name={icon} size={20} />
    </span>
  );
}

/**
 * Barra de navegación fija abajo, solo bajo 1024 px (spec 002, RF-16 y RF-45 a RF-48). Cada botón lleva icono y
 * nombre; el actual se marca con `aria-current`. El último abre un panel con el resto («Más»). Ocupa 4 rem más la
 * zona segura del teléfono: es el `--nav-space` que reserva `tokens.css` mientras la barra existe.
 */
export function BottomNav({ label, items, more }: { label: string; items: BottomNavItem[]; more: { label: string; current: boolean; expanded: boolean; onOpen: () => void } }) {
  return (
    <nav data-bottom-nav aria-label={label} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom,0px)] lg:hidden">
      <ul className="mx-auto flex h-16 max-w-xl px-1">
        {items.map((item) => (
          <li key={item.href} className="flex min-w-0 flex-1 py-1">
            <Link href={item.href} aria-current={item.current ? "page" : undefined} className={cell(item.current)}>
              <Mark icon={item.icon} current={item.current} />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          </li>
        ))}
        <li className="flex min-w-0 flex-1 py-1">
          <button type="button" aria-haspopup="dialog" aria-expanded={more.expanded} aria-current={more.current ? "page" : undefined} onClick={more.onOpen} className={cell(more.current)}>
            <Mark icon="more" current={more.current} />
            <span className="max-w-full truncate">{more.label}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
