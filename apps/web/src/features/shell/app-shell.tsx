"use client";

// Estructura de la app (spec 002, RF-12, RF-16 a RF-18), dirección Tablero. Un solo bloque azul: en teléfono es la
// banda superior con el logo, el negocio activo y el botón del menú; desde 1024 px es el menú lateral fijo.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { BusinessColor } from "@/domain/business-color";
import { LogoutButton } from "@/features/auth/logout-button";
import { es } from "@/i18n";
import type { PublicUser } from "@/server/services/users-public";
import { BusinessBadge, Icon, IconButton, Sheet, type IconName } from "@/ui";
import { LogoMark, Wordmark } from "@/ui/brand/logo";

const t = es.shell;

export interface ActiveForShell {
  business: string;
  branch: string;
  color: BusinessColor;
}

function NavItems({ user, onNavigate }: { user: PublicUser; onNavigate?: () => void }) {
  const path = usePathname();
  const items: [string, string, IconName][] = [
    ["/", t.home, "home"],
    ["/productos", t.products, "box"],
    ["/proveedores", t.suppliers, "truck"],
    ["/almacenes", t.places, "warehouse"],
    ...(user.role === "owner"
      ? ([
          ["/negocios", t.businesses, "store"],
          ["/personas", t.people, "users"],
        ] as [string, string, IconName][])
      : []),
    ["/cambiar-contrasena", t.password, "key"],
  ];
  return (
    <ul className="flex flex-col gap-1">
      {items.map(([href, label, icon]) => {
        const current = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={current ? "page" : undefined}
              className={`relative flex min-h-11 items-center gap-3 rounded-md px-3 text-on-band hover:bg-band-pill ${current ? "bg-band-pill font-bold" : "font-medium"}`}
            >
              {current ? <span aria-hidden className="absolute top-3 bottom-3 left-0 w-1 rounded-full bg-band-accent" /> : null}
              <Icon name={icon} className={current ? "text-band-accent" : "text-band-muted"} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AppShell({ user, active, children }: { user: PublicUser; active: ActiveForShell | null; children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const label = active ? t.activeBranch(active.business, active.branch) : t.noBranch;
  return (
    <div className="lg:pl-64">
      <aside className="bg-band text-on-band lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-64 lg:flex-col lg:overflow-y-auto lg:px-3.5 lg:py-5">
        <div className="flex items-center gap-3 px-5 pt-3 lg:px-2 lg:pt-0 lg:pb-5">
          <Link href="/" className="flex min-h-11 items-center gap-2.5">
            <LogoMark size={30} bare />
            <Wordmark tone="band" />
          </Link>
          <span className="flex-1" />
          <IconButton tone="band" label={t.menu} aria-haspopup="dialog" aria-expanded={menu} className="lg:hidden" onClick={() => setMenu(true)}>
            <Icon name="menu" />
          </IconButton>
        </div>
        <div className="flex flex-col gap-1.5 px-5 pt-2 lg:px-2 lg:pt-0 lg:pb-5">
          <p aria-hidden className="hidden text-xs font-semibold tracking-widest text-band-muted uppercase lg:block">
            {t.workingIn}
          </p>
          <Link href="/elegir-sucursal" aria-label={t.switchBranchFrom(label)} title={label} className="flex min-h-11 max-w-full min-w-0 items-center self-start">
            {active ? (
              <BusinessBadge tone="band" color={active.color} testId="active-branch">
                {label}
              </BusinessBadge>
            ) : (
              <span data-testid="active-branch" className="inline-flex h-8 items-center rounded-md bg-band-pill px-3 text-xs font-semibold tracking-wider uppercase">
                {label}
              </span>
            )}
          </Link>
        </div>
        <nav aria-label={t.nav} className="hidden lg:flex lg:flex-1 lg:flex-col">
          <NavItems user={user} />
          <span className="flex-1" />
          <LogoutButton appearance="nav" />
        </nav>
      </aside>
      <Sheet open={menu} label={t.nav} onClose={() => setMenu(false)}>
        <nav aria-label={t.nav} className="flex flex-1 flex-col">
          <NavItems user={user} onNavigate={() => setMenu(false)} />
          <span className="flex-1" />
          <LogoutButton appearance="nav" />
        </nav>
      </Sheet>
      {children}
    </div>
  );
}
