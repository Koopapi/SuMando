import type { ReactNode } from "react";

/**
 * Cabecera de página de la dirección Tablero: en teléfono continúa la banda azul con el título y el número
 * importante en ámbar; desde 1024 px es una cabecera clara con línea inferior y el número en azul.
 */
export function PageHeader({ title, subtitle, figure, figureLabel, action }: { title: string; subtitle?: string; figure?: string; figureLabel?: string; action?: ReactNode }) {
  return (
    <header className="-mx-4 -mt-6 flex flex-col gap-4 bg-band px-5 pt-2 pb-6 text-on-band lg:mx-0 lg:mt-0 lg:flex-row lg:items-end lg:gap-6 lg:border-b lg:border-line lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-5 lg:text-ink">
      <div className="flex items-end gap-4 lg:flex-1">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="font-brand text-3xl leading-tight font-bold tracking-tight lg:text-4xl">{title}</h1>
          {subtitle ? <p className="text-sm text-band-muted lg:text-base lg:text-ink-muted">{subtitle}</p> : null}
        </div>
        {figure ? (
          <p className="flex shrink-0 flex-col items-end" data-testid="page-figure">
            <span className="font-brand text-4xl leading-none font-bold tracking-tight text-band-accent lg:text-5xl lg:text-primary">{figure}</span>
            {figureLabel ? <span className="text-xs font-semibold tracking-widest text-band-muted uppercase lg:text-ink-muted">{figureLabel}</span> : null}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex [&>*]:w-full lg:[&>*]:w-auto">{action}</div> : null}
    </header>
  );
}
