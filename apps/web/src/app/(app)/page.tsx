// Spec 001 RF-41: inicio con la persona, el negocio y la sucursal activa, y los accesos. Spec 002: dirección Tablero.
import Link from "next/link";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { listBusinesses } from "@/server/services/businesses";
import { catalogView } from "@/server/services/catalog/views";
import { listPeople } from "@/server/services/people";
import { listCalculations } from "@/server/services/recipes/calculations";
import { listRecipes } from "@/server/services/recipes/recipes";
import { BusinessBlock, Icon, ListRow, PageShell, SectionLabel, formatDateTime } from "@/ui";

export const dynamic = "force-dynamic";

function TextLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary">
      {children}
      <Icon name="arrowRight" size={16} />
    </Link>
  );
}

export default async function HomePage() {
  const { user, active } = await requirePageBranch();
  const t = es.home;
  const ctx = appCtx();
  const owner = user.role === "owner";
  const [businesses, people] = owner ? await Promise.all([listBusinesses(ctx, user), listPeople(ctx, user)]) : [[], []];
  const activeBusinesses = businesses.filter((b) => !b.archivedAt);
  const branchCount = activeBusinesses.reduce((n, b) => n + b.branches.filter((br) => !br.archivedAt).length, 0);
  const activePeople = people.filter((p) => p.isActive);
  const scope = { actor: user, active };
  const [catalog, recipes, calculations] = await Promise.all([catalogView(ctx, scope), listRecipes(ctx, scope), listCalculations(ctx, scope)]);
  const activeCount = (list: { archived: boolean }[]) => list.filter((x) => !x.archived).length;
  return (
    <PageShell title={t.title} subtitle={t.greeting(user.name)}>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <section aria-labelledby="sucursal-activa" className="flex min-w-0 flex-col gap-3">
          <SectionLabel>{t.activeBranch}</SectionLabel>
          <span id="sucursal-activa" className="sr-only" data-testid="home-branch">
            {es.shell.activeBranch(active.business.name, active.branch.name)}
          </span>
          <BusinessBlock color={active.business.color} name={active.business.name} detail={t.branchLine(active.branch.name)} />
          <div className="flex flex-col lg:flex-row lg:gap-6">
            <TextLink href="/elegir-sucursal">{t.switchBranch}</TextLink>
            <TextLink href="/cambiar-contrasena">{t.password}</TextLink>
          </div>
        </section>
        {owner ? (
          <section className="flex flex-col gap-1">
            <SectionLabel>{t.adminLabel}</SectionLabel>
            <ListRow href="/negocios" icon="store" title={t.businesses} detail={t.businessesDetail(activeBusinesses.length, branchCount)} />
            <ListRow href="/personas" icon="users" title={t.people} detail={t.peopleDetail(activePeople.length, activePeople.filter((p) => p.mustChangePassword).length)} />
          </section>
        ) : null}
      </div>
      <section className="flex flex-col gap-1">
        <SectionLabel>{t.catalogLabel}</SectionLabel>
        <div className="grid lg:grid-cols-3 lg:gap-x-8">
          <ListRow href="/productos" icon="box" title={es.shell.products} detail={t.productsDetail(activeCount(catalog.products))} />
          <ListRow href="/proveedores" icon="truck" title={es.shell.suppliers} detail={t.suppliersDetail(activeCount(catalog.suppliers))} />
          <ListRow href="/almacenes" icon="warehouse" title={es.shell.places} detail={t.placesDetail(activeCount(catalog.warehouses), activeCount(catalog.areas))} />
        </div>
      </section>
      <section className="flex flex-col gap-1">
        <SectionLabel>{t.recipesLabel}</SectionLabel>
        <div className="grid lg:grid-cols-3 lg:gap-x-8">
          <ListRow href="/recetas" icon="recipe" title={es.shell.recipes} detail={t.recipesDetail(activeCount(recipes))} />
          <ListRow href="/insumos" icon="calculator" title={es.shell.supplies} detail={calculations[0] ? t.lastCalculation(formatDateTime(new Date(calculations[0].createdAt))) : t.noCalculations} />
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <SectionLabel>{t.soon}</SectionLabel>
        <ul className="flex flex-wrap gap-2">
          {t.modules.map((m) => (
            <li key={m} className="rounded-md border border-line-strong px-2.5 py-1 text-sm text-ink-muted">
              {m}
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
