// Spec 004 RF-20 a RF-28, RF-33, RF-34, RF-36, RF-39: cálculo de insumos en la sucursal activa. Puede empezar con
// las piezas de un cálculo guardado (`?base=`) o de una plantilla (`?plantilla=`).
import { SupplyCalculator } from "@/features/recipes/supply-calculator";
import { es } from "@/i18n";
import { appCtx } from "@/server/app-context";
import { requirePageBranch } from "@/server/auth/page-guards";
import { isAppError } from "@/server/errors";
import { calculationBase, calculationBoard, calculationDetail } from "@/server/services/recipes/calculations";
import { templateStart } from "@/server/services/recipes/templates";
import type { PiecesItem } from "@/server/services/recipes/views";
import { PageShell, formatDateTime } from "@/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: es.recipes.supplies.title };

const UUID = /^[0-9a-f-]{36}$/i;
const orNull = <T,>(p: Promise<T>) =>
  p.catch((e) => {
    if (isAppError(e) && e.code === "not_found") return null;
    throw e;
  });

export default async function SuppliesPage({ searchParams }: { searchParams: Promise<{ base?: string; plantilla?: string }> }) {
  const { user, active } = await requirePageBranch();
  const scope = { actor: user, active };
  const ctx = appCtx();
  const { base, plantilla } = await searchParams;
  const t = es.recipes.supplies;
  let initial: PiecesItem[] = [];
  let dropped: string[] = [];
  let notice: string | undefined;
  if (base && UUID.test(base)) {
    const [calc, start] = await Promise.all([orNull(calculationDetail(ctx, scope, base)), orNull(calculationBase(ctx, scope, base))]);
    if (calc && start) {
      ({ items: initial, dropped } = start);
      notice = t.fromBase(formatDateTime(new Date(calc.createdAt)));
    }
  } else if (plantilla && UUID.test(plantilla)) {
    const start = await orNull(templateStart(ctx, scope, plantilla));
    if (start) {
      ({ items: initial, dropped } = start);
      notice = t.fromTemplate(start.template.name);
    }
  }
  const { recipes } = await calculationBoard(ctx, scope);
  return (
    <PageShell>
      <SupplyCalculator key={`${base ?? ""}${plantilla ?? ""}`} recipes={recipes} initial={initial} notice={notice} dropped={dropped} />
    </PageShell>
  );
}
