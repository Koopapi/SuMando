"use client";

// Spec 009 RF-44: imprimir la hoja de pago desde el navegador.
import { es } from "@/i18n";
import { Button } from "@/ui";

export function PrintButton() {
  return <Button onClick={() => window.print()}>{es.payroll.print}</Button>;
}
