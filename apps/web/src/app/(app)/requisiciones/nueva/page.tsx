// Spec 007 RF-7 a RF-23: armar una requisición; `?plantilla=` empieza con una plantilla de compra.
import { RequisitionBuilder } from "@/features/requisitions/requisition-builder";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { builderData, suggestLines } from "@/server/services/requisitions/requisitions";
import { PageShell, formatDateTime } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.requisitions.newTitle };

export default async function Page({ searchParams }: { searchParams: Promise<{ plantilla?: string }> }) {
  const { user, active } = await requirePageBranch();
  const scope = { actor: user, active };
  const ctx = appCtx();
  const data = await builderData(ctx, scope);
  const { plantilla } = await searchParams;
  const start =
    plantilla && data.warehouses[0]
      ? await suggestLines(ctx, scope, { warehouseId: data.warehouses[0].id, source: "template", id: plantilla }).catch((e) => {
          if (isAppError(e) && e.code === "not_found") return null;
          throw e;
        })
      : null;
  const t = es.requisitions;
  return (
    <PageShell>
      <RequisitionBuilder
        {...data}
        calculations={data.calculations.map((c) => ({ id: c.id, label: t.calculationOption(formatDateTime(new Date(c.createdAt)), c.author) }))}
        initial={start?.lines}
        initialNotice={start ? [t.added(start.lines.length), start.skipped.length ? t.skipped(start.skipped.join(", ")) : ""].filter(Boolean).join(" ") : undefined}
      />
    </PageShell>
  );
}
