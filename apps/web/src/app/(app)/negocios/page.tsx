// RF-17 a RF-22: negocios y sucursales, solo para el dueño.
import { BusinessesManager } from "@/features/businesses/businesses-manager";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requireOwnerPage } from "@/server/auth/page-guards";
import { businessView, listBusinesses } from "@/server/services/businesses";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";

export default async function BusinessesPage() {
  const session = await requireOwnerPage();
  const businesses = (await listBusinesses(appCtx(), session.user)).map(businessView);
  return (
    <PageShell title={es.businesses.title}>
      <BusinessesManager businesses={businesses} />
    </PageShell>
  );
}
