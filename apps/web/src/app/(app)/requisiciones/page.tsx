// Spec 007 RF-42, RF-43: requisiciones de la sucursal activa (`?estado=`).
import { RequisitionsList } from "@/features/requisitions/requisitions-list";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { listRequisitions } from "@/server/services/requisitions/requisitions";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.requisitions.title };

const STATUSES = ["requested", "approved", "rejected", "cancelled", "closed"];

export default async function Page({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { user, active } = await requirePageBranch();
  const { estado } = await searchParams;
  const status = estado && STATUSES.includes(estado) ? estado : undefined;
  const list = await listRequisitions(appCtx(), { actor: user, active }, status ?? null);
  return (
    <PageShell>
      <RequisitionsList requisitions={list} status={status} />
    </PageShell>
  );
}
