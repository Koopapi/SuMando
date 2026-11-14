// Spec 010 RF-16: los checklists de hoy de la sucursal activa.
import { ChecklistsHome } from "@/features/checklists/lists";
import { todayInMexico } from "@/domain/personnel/documents";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { todayChecklists } from "@/server/services/checklists/sheets";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.checklists.title };

export default async function Page() {
  const { user, active } = await requirePageBranch();
  const ctx = appCtx();
  const items = await todayChecklists(ctx, { kind: "user", scope: { actor: user, active } });
  return (
    <PageShell>
      <ChecklistsHome items={items} today={todayInMexico(ctx.ports.clock.now())} />
    </PageShell>
  );
}
