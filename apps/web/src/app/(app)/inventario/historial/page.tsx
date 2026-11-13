// Spec 005 RF-61: historial de un producto en un almacén (`?almacen=&producto=&antes=`).
import { notFound } from "next/navigation";
import { ProductHistory } from "@/features/inventory/product-history";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { productHistory } from "@/server/services/inventory/movements";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.movementsTitle };

export default async function Page({ searchParams }: { searchParams: Promise<{ almacen?: string; producto?: string; antes?: string }> }) {
  const { user, active } = await requirePageBranch();
  const { almacen, producto, antes } = await searchParams;
  const before = antes && /^\d+$/.test(antes) ? Number(antes) : null;
  const data = await productHistory(appCtx(), { actor: user, active }, almacen ?? "", producto ?? "", before).catch((e) => {
    if (isAppError(e) && e.code === "not_found") return null;
    throw e;
  });
  if (!data) notFound();
  return (
    <PageShell>
      <ProductHistory {...data} />
    </PageShell>
  );
}
