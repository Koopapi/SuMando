import type { ReactNode } from "react";

/** Estructura de página, móvil primero: margen de 16 px, ancho máximo en escritorio, título como h1. */
export function PageShell({ title, actions, children, narrow = false }: { title: string; actions?: ReactNode; children: ReactNode; narrow?: boolean }) {
  return (
    <main className={`mx-auto flex w-full flex-col gap-6 px-4 py-6 ${narrow ? "max-w-md" : "max-w-5xl"}`}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </header>
      {children}
    </main>
  );
}
