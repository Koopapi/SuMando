import type { ReactNode } from "react";
import { Logo } from "./brand/logo";

/** Estructura de página, móvil primero: margen de 16 px, ancho máximo en escritorio, título como h1. Con `brand`,
 * el logo de SuMando encabeza la página (entrada, primer arranque, sin conexión y no encontrada: RF-1). */
export function PageShell({ title, actions, children, narrow = false, brand = false }: { title: string; actions?: ReactNode; children: ReactNode; narrow?: boolean; brand?: boolean }) {
  return (
    <main className={`mx-auto flex w-full flex-col gap-6 px-4 py-6 ${narrow ? "max-w-md" : "max-w-5xl"} ${brand ? "pt-10" : ""}`}>
      {brand ? (
        <div data-testid="brand" className="flex justify-center">
          <Logo size="lg" />
        </div>
      ) : null}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-brand text-2xl font-bold">{title}</h1>
        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </header>
      {children}
    </main>
  );
}
