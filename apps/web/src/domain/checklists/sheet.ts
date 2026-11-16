// Reglas de la hoja del día (spec 010, RF-19, RF-25 a RF-28, RF-31, RF-33).
import type { ItemKind } from "./template";

export interface SheetItemState {
  itemId: string;
  kind: ItemKind;
  isKey: boolean;
  done: boolean;
}

export interface SheetSectionState {
  sectionId: string;
  positionId: string | null;
  ready: boolean;
  items: SheetItemState[];
}

/** RF-25, RF-26: «Todo en orden» palomea las palomitas sin foto que no son clave y faltan. */
export const allOkTargets = (items: SheetItemState[]) => items.filter((i) => i.kind === "check" && !i.isKey && !i.done).map((i) => i.itemId);

/** RF-28: puntos clave sin palomear. */
export const keyPending = (items: SheetItemState[]) => items.filter((i) => i.isKey && !i.done).length;

/** RF-31: la hoja está completa cuando todas sus secciones están listas. */
export const allReady = (sections: { ready: boolean }[]) => sections.length > 0 && sections.every((s) => s.ready);

/** RF-33: lo que quedó pendiente al cerrar: secciones no listas, con sus puntos clave sin palomear. */
export function pendingAtClose(sections: (SheetSectionState & { name: string; itemsText?: Record<string, string> })[]) {
  return sections
    .filter((s) => !s.ready)
    .map((s) => ({ sectionId: s.sectionId, name: s.name, keyItems: s.items.filter((i) => i.isKey && !i.done).map((i) => s.itemsText?.[i.itemId] ?? i.itemId) }));
}

/** RF-19: primero las secciones del puesto de quien llena, cada grupo en su orden. */
export function orderForPosition<T extends { positionId: string | null }>(sections: T[], positionId: string | null): T[] {
  if (!positionId) return sections;
  return [...sections.filter((s) => s.positionId === positionId), ...sections.filter((s) => s.positionId !== positionId)];
}
