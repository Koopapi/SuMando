"use client";

// «Vista completa» y «Paso a paso» (spec 015, RF-24 a RF-27): se guarda lo capturado, se recuerda la elección de la
// persona para esa tarea y se abre la otra vista, que continúa con lo mismo.
import type { WizardKind } from "@/domain/wizards/drafts";
import { api } from "../api";

export type View = "wizard" | "full";

/** Dirección de la otra vista: `vista` la fuerza y `continuar` retoma lo guardado sin preguntar. */
export function viewHref(path: string, view: View, resume = true) {
  const [base, query = ""] = path.split("?");
  const q = new URLSearchParams(query);
  q.set("vista", view === "full" ? "completa" : "asistente");
  if (resume) q.set("continuar", "1");
  else q.delete("continuar");
  return `${base}?${q.toString()}`;
}

export async function switchView(kind: WizardKind, view: View, save: () => Promise<void>) {
  await save();
  await api(`/api/wizards/${kind}/view`, { method: "PUT", body: { view } });
}
