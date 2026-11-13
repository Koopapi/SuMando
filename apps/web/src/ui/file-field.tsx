import { useId, type InputHTMLAttributes } from "react";

/** Elegir un archivo (spec 004: recetario de Excel), con etiqueta y ayuda; el botón del sistema mide 44 px o más. */
export function FileField({ label, hint, className = "", ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> & { label: string; hint?: string }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        type="file"
        aria-describedby={hintId}
        className="block w-full min-w-0 text-base text-ink file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border file:border-line-strong file:bg-surface file:px-4 file:font-semibold file:text-primary hover:file:bg-primary-soft"
        {...rest}
      />
      {hint ? (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
