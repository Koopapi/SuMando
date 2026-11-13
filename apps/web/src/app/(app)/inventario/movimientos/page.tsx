// Spec 005 RF-62: lista de movimientos con filtros (`?tipo=&almacen=&desde=&hasta=&antes=`).
import { MovementsList } from "@/features/inventory/movements-list";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { listMovements, parseCursor } from "@/server/services/inventory/movements";
import { inventoryWarehouses } from "@/server/services/inventory/stock";
import { PageShell } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.inventory.movementsTitle };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Días completos en la hora de México (UTC−6, sin horario de verano). */
const day = (raw: string | undefined, end: boolean) => (raw && DAY.test(raw) ? new Date(`${raw}T${end ? "23:59:59.999" : "00:00:00"}-06:00`) : null);

export default async function Page({ searchParams }: { searchParams: Promise<{ tipo?: string; almacen?: string; desde?: string; hasta?: string; antes?: string }> }) {
  const { user, active } = await requirePageBranch();
  const scope = { actor: user, active };
  const ctx = appCtx();
  const f = await searchParams;
  const warehouses = await inventoryWarehouses(ctx, scope);
  const filters = { tipo: f.tipo, almacen: warehouses.some((w) => w.id === f.almacen) ? f.almacen : undefined, desde: f.desde, hasta: f.hasta };
  const page = await listMovements(ctx, scope, { kind: filters.tipo || null, warehouseId: filters.almacen ?? null, from: day(f.desde, false), to: day(f.hasta, true), before: parseCursor(f.antes) }).catch((e) => {
    if (isAppError(e) && e.code === "validation") return { movements: [], next: null };
    throw e;
  });
  return (
    <PageShell>
      <MovementsList movements={page.movements} next={page.next} warehouses={warehouses} filters={filters} />
    </PageShell>
  );
}
