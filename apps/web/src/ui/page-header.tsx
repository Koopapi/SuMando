import type { ReactNode } from "react";

/**
 * Cabecera de página de la dirección Tablero: en teléfono continúa la banda azul con el título y el número
 * importante en ámbar; desde 1024 px es una cabecera clara con línea inferior y el número en azul. Spec 014, RF-23:
 * baja (título y descripción en hasta 120 px en escritorio y 160 px en teléfono) y con las acciones en una fila.
 */
export function PageHeader({ title, subtitle, figure, figureLabel, action }: { title: string; subtitle?: string; figure?: string; figureLabel?: string; action?: ReactNode }) {
  return (
    <header className="band-scope -mx-4 -mt-4 flex flex-col gap-3 bg-band px-5 pt-1 pb-4 text-on-band lg:mx-0 lg:mt-0 lg:flex-row lg:items-end lg:gap-6 lg:border-b lg:border-line lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-3 lg:text-ink">
      <div className="flex items-end gap-4 lg:flex-1" data-testid="page-title">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="font-brand text-2xl leading-tight font-bold tracking-tight lg:text-3xl">{title}</h1>
          {subtitle ? <p className="line-clamp-2 text-sm text-band-muted lg:line-clamp-1 lg:text-ink-muted">{subtitle}</p> : null}
        </div>
        {figure ? (
          <p className="flex shrink-0 flex-col items-end" data-testid="page-figure">
            <span className="font-brand text-3xl leading-none font-bold tracking-tight text-band-accent lg:text-4xl lg:text-primary">{figure}</span>
            {figureLabel ? <span className="text-xs font-semibold tracking-widest text-band-muted uppercase lg:text-ink-muted">{figureLabel}</span> : null}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </header>
  );
}
