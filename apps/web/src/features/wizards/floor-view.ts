"use client";

// Spec 015, RF-22 y RF-26 en el teléfono de piso: no hay una cuenta de persona donde guardar la elección de vista, así
// que se recuerda en ese teléfono por empleado y tarea, como el nombre elegido (spec 010).
import type { WizardKind } from "@/domain/wizards/drafts";
import type { View } from "./view-switch";

const key = (kind: WizardKind, employee: string) => `mando.piso.vista.${kind}.${employee}`;

export function readFloorView(kind: WizardKind, employee: string): View {
  try {
    return localStorage.getItem(key(kind, employee)) === "full" ? "full" : "wizard";
  } catch {
    return "wizard";
  }
}

export function writeFloorView(kind: WizardKind, employee: string, view: View) {
  try {
    localStorage.setItem(key(kind, employee), view);
  } catch {
    // Sin almacenamiento, el teléfono abre el asistente cada vez (RF-23).
  }
}
