"use client";

// Estructura de la app (spec 002, RF-12, RF-16 a RF-18 y RF-45 a RF-48), dirección Tablero. Un solo bloque azul: en
// teléfono es la banda superior con el logo y el negocio activo, y la navegación va en la barra inferior con «Más»;
// desde 1024 px el bloque es el menú lateral fijo con todos los destinos.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { BusinessColor } from "@/domain/business-color";
import { activeHref, navigation, type NavGroup, type NavItem, type NavKey } from "@/domain/navigation";
import { LogoutButton } from "@/features/auth/logout-button";
import { es } from "@/i18n";
import type { PublicUser } from "@/server/services/users-public";
import { BottomNav, BusinessBadge, Icon, Sheet } from "@/ui";
import { LogoMark, Wordmark } from "@/ui/brand/logo";

const t = es.shell;

export interface ActiveForShell {
  business: string;
  branch: string;
  color: BusinessColor;
}

const label = (key: NavKey) => t[key];

function NavList({ items, current, onNavigate }: { items: NavItem[]; current: string | null; onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map(({ href, key, icon }) => {
        const on = href === current;
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={on ? "page" : undefined}
              className={`relative flex min-h-11 items-center gap-3 rounded-md px-3 text-on-band hover:bg-band-pill lg:min-h-10 ${on ? "bg-band-pill font-bold" : "font-medium"}`}
            >
              {on ? <span aria-hidden className="absolute top-2.5 bottom-2.5 left-0 w-1 rounded-full bg-band-accent" /> : null}
              <Icon name={icon} size={18} className={on ? "text-band-accent" : "text-band-muted"} />
              {label(key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** RF-2 y RF-7: cada categoría con su título. */
function NavGroups({ groups, current, onNavigate }: { groups: NavGroup[]; current: string | null; onNavigate?: () => void }) {
  return (
    <>
      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`nav-${g.key}`} className="flex flex-col gap-1">
          <h2 id={`nav-${g.key}`} className="px-3 pt-3 text-xs font-semibold tracking-widest text-band-muted uppercase">
            {t.groups[g.key]}
          </h2>
          <NavList items={g.items} current={current} onNavigate={onNavigate} />
        </section>
      ))}
    </>
  );
}

/** RF-4: «Cambiar contraseña» y «Salir» en el menú de la cuenta, con el nombre de quien usa la app. */
function AccountMenu({ name, onNavigate }: { name: string; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-0.5 border-t border-band-pill pt-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label={t.accountOf(name)}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left font-semibold text-on-band hover:bg-band-pill"
      >
        <span aria-hidden className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-band-pill text-sm font-bold">
          {name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={18} className="text-band-muted" />
      </button>
      {open ? (
        <ul id="account-menu" className="flex flex-col gap-0.5">
          <li>
            <Link href="/cambiar-contrasena" onClick={onNavigate} className="flex min-h-11 items-center gap-3 rounded-md px-3 font-medium text-on-band hover:bg-band-pill">
              <Icon name="key" size={18} className="text-band-muted" />
              {t.password}
            </Link>
          </li>
          <li>
            <LogoutButton appearance="nav" />
          </li>
        </ul>
      ) : null}
    </div>
  );
}

export function AppShell({ user, active, children }: { user: PublicUser; active: ActiveForShell | null; children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const path = usePathname();
  const nav = navigation(user.role === "owner" ? "owner" : "admin");
  const current = activeHref(path, [...nav.top, ...nav.groups.flatMap((g) => g.items)].map((i) => i.href));
  const branchLabel = active ? t.activeBranch(active.business, active.branch) : t.noBranch;
  return (
    <div className="pb-(--nav-space) lg:pl-64 print:p-0">
      <aside className="bg-band text-on-band print:hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-64 lg:flex-col lg:overflow-y-auto lg:px-3.5 lg:py-5">
        <div className="flex items-center gap-3 px-5 pt-3 lg:px-2 lg:pt-0 lg:pb-5">
          <Link href="/" className="flex min-h-11 items-center gap-2.5">
            <LogoMark size={30} bare />
            <Wordmark tone="band" />
          </Link>
        </div>
        <div className="flex flex-col gap-1.5 px-5 pt-2 lg:px-2 lg:pt-0 lg:pb-5">
          <p aria-hidden className="hidden text-xs font-semibold tracking-widest text-band-muted uppercase lg:block">
            {t.workingIn}
          </p>
          <Link href="/elegir-sucursal" aria-label={t.switchBranchFrom(branchLabel)} title={branchLabel} className="flex min-h-11 max-w-full min-w-0 items-center self-start">
            {active ? (
              <BusinessBadge tone="band" color={active.color} testId="active-branch">
                {branchLabel}
              </BusinessBadge>
            ) : (
              <span data-testid="active-branch" className="inline-flex h-8 items-center rounded-md bg-band-pill px-3 text-xs font-semibold tracking-wider uppercase">
                {branchLabel}
              </span>
            )}
          </Link>
        </div>
        <nav aria-label={t.nav} className="hidden lg:flex lg:flex-1 lg:flex-col lg:gap-1">
          <NavList items={nav.top} current={current} />
          <NavGroups groups={nav.groups} current={current} />
          <span className="min-h-4 flex-1" />
          <AccountMenu name={user.name} />
        </nav>
      </aside>
      <BottomNav
        label={t.nav}
        items={nav.bar.map(({ href, key, icon }) => ({ href, label: label(key), icon, current: href === current }))}
        more={{ label: t.more, expanded: menu, current: current !== null && !nav.bar.some((b) => b.href === current), onOpen: () => setMenu(true) }}
      />
      <Sheet open={menu} label={t.more} onClose={() => setMenu(false)}>
        <nav aria-label={t.moreNav} className="flex flex-1 flex-col gap-1">
          <NavGroups groups={nav.more} current={current} onNavigate={() => setMenu(false)} />
          <span className="min-h-4 flex-1" />
          <AccountMenu name={user.name} onNavigate={() => setMenu(false)} />
        </nav>
      </Sheet>
      {children}
    </div>
  );
}
