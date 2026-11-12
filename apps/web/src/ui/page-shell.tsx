import type { ReactNode } from "react";
import { LogoMark, Wordmark } from "./brand/logo";
import { PageHeader } from "./page-header";

/**
 * Página con sesión (dirección Tablero): el contenido va bajo la banda azul de la estructura. Si lleva `title`, la
 * cabecera continúa la banda en teléfono y es una cabecera clara desde 1024 px. Sin `title`, la pantalla pone su
 * propia `PageHeader` (por ejemplo, cuando su acción principal es interactiva).
 */
export function PageShell({ title, subtitle, figure, figureLabel, action, children, narrow = false }: { title?: string; subtitle?: string; figure?: string; figureLabel?: string; action?: ReactNode; children: ReactNode; narrow?: boolean }) {
  return (
    <main className={`mx-auto flex w-full flex-col gap-6 px-4 pt-6 pb-10 lg:px-12 lg:py-9 ${narrow ? "max-w-3xl" : "max-w-6xl"}`}>
      {title ? <PageHeader title={title} subtitle={subtitle} figure={figure} figureLabel={figureLabel} action={action} /> : null}
      {children}
    </main>
  );
}

/**
 * Pantallas sin sesión (entrar, primer arranque, cambiar contraseña, sin conexión, no encontrada): banda azul con el
 * logo, el título y su explicación, y el contenido debajo. Lleva el nombre SuMando visible (spec 002, RF-1).
 */
export function AuthShell({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="bg-band text-on-band">
        <div className="mx-auto flex max-w-md flex-col gap-6 px-5 pt-4 pb-7">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <div data-testid="brand" className="flex items-center gap-2.5">
              <LogoMark size={30} bare />
              <Wordmark tone="band" />
            </div>
            {actions}
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="font-brand text-3xl leading-tight font-bold tracking-tight">{title}</h1>
            {subtitle ? <p className="text-band-muted">{subtitle}</p> : null}
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-md flex-col gap-5 px-5 py-7">{children}</main>
    </div>
  );
}
