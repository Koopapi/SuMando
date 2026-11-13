// Spec 004 RF-31 a RF-33: un cálculo guardado de la sucursal activa; de otra sucursal, no existe (RF-6).
import { notFound } from "next/navigation";
import { CalculationDetail } from "@/features/recipes/calculation-detail";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { calculationDetail } from "@/server/services/recipes/calculations";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";

export default async function CalculationPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, active } = await requirePageBranch();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const calculation = await calculationDetail(appCtx(), { actor: user, active }, id).catch((e) => {
    if (isAppError(e) && e.code === "not_found") return null;
    throw e;
  });
  if (!calculation) notFound();
  return (
    <PageShell>
      <CalculationDetail calculation={calculation} />
    </PageShell>
  );
}
