// Cómo se nombran en pantalla las medidas, tipos de movimiento y motivos del inventario (spec 005).
import { es } from "@/i18n";
import { formatQuantity } from "@/ui";
import type { Measure, WarehouseOption } from "@/server/services/inventory/views";
import { unitShort } from "../catalog/labels";

const t = es.inventory;

/** La presentación de conteo o, si no hay, la abreviatura de la unidad base (RF-9). */
export const measureLabel = (m: Measure) => m.presentation ?? unitShort(m.baseUnit);

export const withMeasure = (quantity: string, m: Measure) => t.quantityWith(formatQuantity(quantity), measureLabel(m));

export const kindLabel = (kind: string) => t.kinds[kind] ?? kind;
export const reasonLabel = (reason: string | null) => (reason ? (t.reasons[reason] ?? reason) : null);

export const warehouseLabel = (w: WarehouseOption) => t.warehouseOption(w.name, t.warehouseScope[w.scope]);
