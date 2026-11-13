// Spec 007 RF-24: editar una requisición solicitada (quien la creó o el dueño).
import { notFound, redirect } from "next/navigation";
import { RequisitionBuilder } from "@/features/requisitions/requisition-builder";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { builderData, requisitionDetail } from "@/server/services/requisitions/requisitions";
import { PageShell, formatDateTime } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.requisitions.title };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { user, active } = await requirePageBranch();
  const scope = { actor: user, active };
  const ctx = appCtx();
  const { id } = await params;
  const r = await requisitionDetail(ctx, scope, id).catch((e) => {
    if (isAppError(e) && e.code === "not_found") return null;
    throw e;
  });
  if (!r) notFound();
  if (!r.canEdit) redirect(`/requisiciones/${r.id}`);
  const data = await builderData(ctx, scope);
  const t = es.requisitions;
  return (
    <PageShell>
      <RequisitionBuilder
        {...data}
        warehouses={[...data.warehouses.filter((w) => w.id === r.warehouse.id), ...(data.warehouses.some((w) => w.id === r.warehouse.id) ? [] : [{ id: r.warehouse.id, name: r.warehouse.name, scope: "branch" as const, archived: r.warehouse.archived }])]}
        calculations={data.calculations.map((c) => ({ id: c.id, label: t.calculationOption(formatDateTime(new Date(c.createdAt)), c.author) }))}
        editing={{ id: r.id, folio: r.folio, warehouseId: r.warehouse.id, note: r.note, lines: r.lines.map((l) => ({ productId: l.productId, name: l.name, baseUnit: l.baseUnit, presentationId: l.presentation.id, quantity: l.quantity, supplierId: l.supplierId })) }}
      />
    </PageShell>
  );
}
