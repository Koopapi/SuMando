// RF-41: pantalla de inicio con la persona, el negocio y la sucursal activa, y los accesos.
import Link from "next/link";
import { es } from "@/i18n";
import { requirePageBranch } from "@/server/auth/page-guards";
import { Card, PageShell } from "@/ui";

export const dynamic = "force-dynamic";

const linkClass = "flex min-h-11 items-center rounded-md border border-line bg-surface px-4 font-medium hover:bg-primary-soft";

export default async function HomePage() {
  const { user, active } = await requirePageBranch();
  const t = es.home;
  return (
    <PageShell title={t.title}>
      <p className="text-lg">{t.greeting(user.name)}</p>
      <Card title={t.activeBranch}>
        <p className="text-xl font-semibold" data-testid="home-branch">
          {es.shell.activeBranch(active.business.name, active.branch.name)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/elegir-sucursal" className={linkClass}>
            {t.switchBranch}
          </Link>
          <Link href="/cambiar-contrasena" className={linkClass}>
            {t.password}
          </Link>
        </div>
      </Card>
      {user.role === "owner" ? (
        <Card title={t.admin}>
          <p className="mb-3 text-sm text-ink-muted">{t.adminIntro}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/negocios" className={linkClass}>
              {t.businesses}
            </Link>
            <Link href="/personas" className={linkClass}>
              {t.people}
            </Link>
          </div>
        </Card>
      ) : null}
      <p className="text-sm text-ink-muted">{t.modulesSoon}</p>
    </PageShell>
  );
}
