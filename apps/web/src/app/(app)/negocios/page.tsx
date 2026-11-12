// RF-17 a RF-22: negocios y sucursales, solo para el dueño.
import { BusinessesManager } from "@/features/businesses/businesses-manager";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requireOwnerPage } from "@/server/auth/page-guards";
import { businessView, listBusinesses, suggestedColor } from "@/server/services/businesses";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";

export default async function BusinessesPage() {
  const session = await requireOwnerPage();
  const ctx = appCtx();
  const [businesses, suggested] = await Promise.all([listBusinesses(ctx, session.user).then((l) => l.map(businessView)), suggestedColor(ctx, session.user)]);
  return (
    <PageShell title={es.businesses.title}>
      <BusinessesManager businesses={businesses} suggestedColor={suggested} />
    </PageShell>
  );
}
