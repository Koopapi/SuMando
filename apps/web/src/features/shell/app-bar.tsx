// Barra de la aplicación (RF-35): negocio y sucursal activa siempre a la vista; cambiarla son dos toques.
import Link from "next/link";
import { LogoutButton } from "@/features/auth/logout-button";
import { es } from "@/i18n";
import type { PublicUser } from "@/server/services/users-public";

const t = es.shell;

export function AppBar({ user, active }: { user: PublicUser; active: { business: string; branch: string } | null }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface-raised">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
        <Link href="/" className="text-lg font-bold text-brand-800">
          {t.brand}
        </Link>
        <Link href="/elegir-sucursal" aria-label={t.switchBranch} className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm hover:bg-brand-50">
          <span className="font-medium" data-testid="active-branch">
            {active ? t.activeBranch(active.business, active.branch) : t.noBranch}
          </span>
          <span className="text-brand-700">{t.change}</span>
        </Link>
        <nav aria-label={t.nav} className="flex w-full flex-wrap items-center gap-1 text-sm sm:w-auto">
          <Link href="/" className="flex min-h-9 items-center rounded-md px-2 hover:bg-brand-50">
            {t.home}
          </Link>
          {user.role === "owner" ? (
            <>
              <Link href="/negocios" className="flex min-h-9 items-center rounded-md px-2 hover:bg-brand-50">
                {t.businesses}
              </Link>
              <Link href="/personas" className="flex min-h-9 items-center rounded-md px-2 hover:bg-brand-50">
                {t.people}
              </Link>
            </>
          ) : null}
          <Link href="/cambiar-contrasena" className="flex min-h-9 items-center rounded-md px-2 hover:bg-brand-50">
            {t.password}
          </Link>
          <span className="ml-auto">
            <LogoutButton />
          </span>
        </nav>
      </div>
    </header>
  );
}
