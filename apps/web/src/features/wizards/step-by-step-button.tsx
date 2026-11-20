"use client";

// «Paso a paso» desde una pantalla completa sin nada capturado (spec 015, RF-25, RF-26): recuerda la elección de la
// persona para esa tarea y abre el asistente.
import { useRouter } from "next/navigation";
import type { WizardKind } from "@/domain/wizards/drafts";
import { es } from "@/i18n";
import { Button } from "@/ui";
import { switchView, viewHref } from "./view-switch";

export function StepByStepButton({ kind, href, label = es.common.stepByStep }: { kind: WizardKind; href: string; label?: string }) {
  const router = useRouter();
  return (
    <Button variant="secondary" onAction={() => switchView(kind, "wizard", async () => {}).then(() => router.push(viewHref(href, "wizard", false)))}>
      {label}
    </Button>
  );
}
