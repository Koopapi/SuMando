"use client";

// «Vista completa» y «Paso a paso» (spec 015, RF-24 a RF-27): se guarda lo capturado, se recuerda la elección de la
// persona para esa tarea y se abre la otra vista, que continúa con lo mismo.
import type { WizardKind } from "@/domain/wizards/drafts";
import { useEffect, useRef } from "react";
import { api } from "../api";
import { draftPath } from "./use-wizard-draft";

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

/** «Paso a paso» desde una pantalla completa con algo capturado: lo guarda como borrador del asistente, recuerda la
 *  elección y devuelve la dirección del asistente, que lo retoma sin preguntar (RF-25 a RF-27). */
export async function toWizard(kind: WizardKind, step: string, data: unknown, path: string) {
  await switchView(kind, "wizard", async () => {
    await api(draftPath(kind), { method: "PUT", body: { step, data } });
  });
  return viewHref(path, "wizard");
}

/** La pantalla completa carga lo capturado en el asistente, si lo hay (RF-27). */
export function useWizardDraftFor<T>(kind: WizardKind | null, onLoad: (data: T) => void) {
  const load = useRef(onLoad);
  useEffect(() => {
    load.current = onLoad;
  });
  useEffect(() => {
    if (!kind) return;
    void api<{ draft: { data: T } | null }>(draftPath(kind)).then((r) => {
      const d = r.ok ? r.data.draft?.data : null;
      if (d) load.current(d);
    });
  }, [kind]);
}

export const discardWizardDraft = (kind: WizardKind) => api(draftPath(kind), { method: "DELETE" });
