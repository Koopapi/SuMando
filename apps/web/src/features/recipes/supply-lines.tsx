// Lista de insumos (spec 004, RF-24 a RF-27): cada ingrediente una vez, con su cantidad exacta y, si se compra en
// otra presentación, cuántas hacen falta. La usan el cálculo en vivo y el cálculo guardado.
import { es } from "@/i18n";
import type { SupplyLineView } from "@/server/services/recipes/views";
import { StatusBadge, formatQuantity } from "@/ui";
import { unitShort } from "../catalog/labels";

const t = es.recipes.supplies;

export function SupplyLines({ lines, label }: { lines: SupplyLineView[]; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-col" data-testid="supply-lines">
      {lines.map((l) => (
        <li key={l.productId} data-product={l.name} className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-0.5 border-b border-line py-2">
          <span className="flex flex-wrap items-center gap-2 font-semibold">
            {l.name}
            {l.archived ? <StatusBadge tone="danger">{t.archived}</StatusBadge> : null}
          </span>
          <span className="flex flex-col items-end">
            <span className="font-brand font-bold" data-testid="supply-total">
              {t.total(formatQuantity(l.total), unitShort(l.baseUnit))}
            </span>
            {l.purchase ? (
              <span className="text-sm text-ink-muted" data-testid="supply-purchase">
                {t.purchase(l.purchase.count, l.purchase.name, formatQuantity(l.purchase.factor), unitShort(l.baseUnit))}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
