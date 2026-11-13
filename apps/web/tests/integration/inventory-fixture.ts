// Escenario del inventario (spec 005) sobre el del catálogo: Pastatti con una bodega de Sendero, una de Centro y
// una central del negocio; Pirrus con su bodega. Queso manchego en gramos (cuenta en piezas de 1 kg) y leche en ml
// en Pastatti; queso manchego en gramos y leche en piezas en Pirrus.
import { createArea, createWarehouse } from "@/server/services/catalog/places";
import { addPresentation, createProduct, updateProduct } from "@/server/services/catalog/products";
import { recordMovement } from "@/server/services/inventory/movements";
import type { CatalogScope } from "@/server/services/catalog/shared";
import { catalogWorld } from "./catalog-fixture";

export async function inventoryWorld() {
  const w = await catalogWorld();
  const bodegaSendero = await createWarehouse(w.ctx, w.ownerSendero, { name: "Bodega Sendero", scope: "branch" });
  const central = await createWarehouse(w.ctx, w.ownerSendero, { name: "Central", scope: "business" });
  const bodegaCentro = await createWarehouse(w.ctx, w.ownerCentro, { name: "Bodega Centro", scope: "branch" });
  const bodegaPirrus = await createWarehouse(w.ctx, w.ownerPirrus, { name: "Bodega Pirrus", scope: "branch" });
  const queso = await createProduct(w.ctx, w.ownerSendero, { name: "Queso manchego", baseUnit: "g" });
  const pieza = await addPresentation(w.ctx, w.ownerSendero, queso.id, { name: "Pieza", factor: "1000" });
  await updateProduct(w.ctx, w.ownerSendero, queso.id, { countPresentationId: pieza.id });
  const leche = await createProduct(w.ctx, w.ownerSendero, { name: "Leche", baseUnit: "ml" });
  const quesoPirrus = await createProduct(w.ctx, w.ownerPirrus, { name: "queso Manchego", baseUnit: "g" });
  const lechePirrus = await createProduct(w.ctx, w.ownerPirrus, { name: "Leche", baseUnit: "pz" });
  const cremaPirrus = await createProduct(w.ctx, w.ownerPirrus, { name: "Crema", baseUnit: "ml" });
  const area = (scope: CatalogScope, name: string) => createArea(w.ctx, scope, { name, responsibleId: w.owner.id });
  const entry = (scope: CatalogScope, warehouseId: string, lines: { productId: string; quantity: string; presentationId?: string | null }[]) => recordMovement(w.ctx, scope, { kind: "entry", warehouseId, lines });
  return { ...w, bodegaSendero, central, bodegaCentro, bodegaPirrus, queso, pieza, leche, quesoPirrus, lechePirrus, cremaPirrus, area, entry };
}

export const code = (p: Promise<unknown>) => p.then(() => "ok", (e: { code?: string }) => e.code ?? String(e));
