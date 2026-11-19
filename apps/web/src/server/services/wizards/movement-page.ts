// Datos de los asistentes «Entrada», «Salida» y «Traspaso» (spec 015, RF-34 a RF-36): lo mismo que la pantalla
// completa, más la existencia y el máximo de cada producto en cada almacén para el aviso de dato raro (RF-13).
import type { CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { movementFormData } from "../inventory/forms";
import { inventoryAccess, loadBook } from "../inventory/shared";
import { levelsForBuilder } from "../requisitions/requisitions";

export async function movementWizardData(ctx: Ctx, scope: CatalogScope) {
  const data = await movementFormData(ctx, scope);
  const access = await inventoryAccess(ctx.store, scope);
  const book = await loadBook(ctx.store, access.businessId);
  // Solo los almacenes donde la persona puede mover, que son los que ya trae el formulario.
  const levels = await levelsForBuilder(ctx, book, access.businessId, data.warehouses.map((w) => w.id));
  return { ...data, levels };
}

export type MovementWizardData = Awaited<ReturnType<typeof movementWizardData>>;
