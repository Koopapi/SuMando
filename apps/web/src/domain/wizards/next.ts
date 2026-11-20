// Qué sigue al confirmar cada asistente (spec 015, RF-9): a dónde ir y con qué texto (clave del diccionario).
import type { WizardKind } from "./drafts";

export type NextKey = "seeRequisition" | "sendLists" | "receive" | "seeStock" | "seeMovement" | "seeTransfer" | "seeWeek" | "paySheet" | "seeCut" | "seeProduct" | "seeSuppliers" | "seeEmployee" | "seeTemplate" | "backToFloor";

export interface NextStep {
  href: string;
  key: NextKey;
}

/** `id` es lo que se registró (o sobre lo que se trabajó): la requisición, el movimiento, la semana… */
export function nextAfter(kind: WizardKind, done: { id: string }): NextStep {
  const id = encodeURIComponent(done.id);
  switch (kind) {
    case "req-new":
    case "req-receive":
      return { href: `/requisiciones/${id}`, key: "seeRequisition" };
    case "req-approve":
      return { href: `/requisiciones/${id}`, key: "sendLists" };
    case "req-buy":
      return { href: `/requisiciones/${id}/recibir`, key: "receive" };
    case "inv-count":
    case "inv-transfer-receive":
      return { href: "/inventario", key: "seeStock" };
    case "inv-entry":
    case "inv-exit":
      return { href: `/inventario/movimientos/${id}`, key: "seeMovement" };
    case "inv-transfer":
      return { href: `/inventario/traspasos/${id}`, key: "seeTransfer" };
    case "pay-attendance":
      return { href: `/nomina/${id}?vista=completa`, key: "seeWeek" };
    case "pay-close":
      return { href: `/nomina/${id}/hoja-de-pago`, key: "paySheet" };
    case "cash-open":
    case "cash-cut":
      return { href: "/caja", key: "seeCut" };
    case "cash-pos":
      return { href: `/caja/${id}`, key: "seeCut" };
    case "new-product":
      return { href: `/productos/${id}`, key: "seeProduct" };
    case "new-supplier":
      return { href: "/proveedores", key: "seeSuppliers" };
    case "new-employee":
      return { href: `/personal/${id}`, key: "seeEmployee" };
    case "new-checklist":
      return { href: `/checklists/plantillas/${id}`, key: "seeTemplate" };
    case "floor-checklist":
    case "floor-cash":
      return { href: "/piso", key: "backToFloor" };
  }
}
