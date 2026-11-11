// Inicio provisional (la pantalla de inicio de RF-41 llega en la entrega 5).
import { LogoutButton } from "@/features/auth/logout-button";
import { es } from "@/i18n";
import { requirePageSession } from "@/server/auth/page-guards";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await requirePageSession();
  return (
    <PageShell title={es.home.title} actions={<LogoutButton />}>
      <p className="text-lg">{es.home.greeting(session.user.name)}</p>
    </PageShell>
  );
}
