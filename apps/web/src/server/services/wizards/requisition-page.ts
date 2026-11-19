// Datos comunes de las páginas de los asistentes sobre una requisición (spec 015, RF-30 a RF-32): la requisición de
// la sucursal activa (de otra, no existe) y los ejemplos del negocio.
import { isAppError } from "../../errors";
import type { CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { requisitionDetail } from "../requisitions/requisitions";
import { wizardExamples } from "./examples";

export async function requisitionWizardData(ctx: Ctx, scope: CatalogScope, id: string) {
  const requisition = await requisitionDetail(ctx, scope, id).catch((e) => {
    if (isAppError(e) && e.code === "not_found") return null;
    throw e;
  });
  if (!requisition) return null;
  return { requisition, examples: await wizardExamples(ctx, scope) };
}
