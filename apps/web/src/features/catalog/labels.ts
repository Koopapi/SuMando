// Cómo se nombra una presentación en pantalla: la de unidad base por su abreviatura (RF-12).
import { es } from "@/i18n";
import type { PresentationView, ProductView } from "@/server/services/catalog/views";

export const unitShort = (unit: string) => es.catalog.unitShort[unit] ?? unit;

export const presentationLabel = (p: PresentationView, unit: string) => p.name ?? unitShort(unit);

export function countLabel(product: ProductView): string {
  const count = product.presentations.find((p) => p.id === product.countPresentationId);
  return count ? presentationLabel(count, product.baseUnit) : unitShort(product.baseUnit);
}

export function unitOptions() {
  return Object.entries(es.catalog.units).map(([value, name]) => ({ value, label: es.catalog.unitOption(name, unitShort(value)) }));
}
