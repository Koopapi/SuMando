import { useId, type InputHTMLAttributes, type ReactNode } from "react";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string;
  hint?: string;
  /** Contenido al final de la caja (botón «Ver», moneda…). */
  trailing?: ReactNode;
  /** Contenido al inicio de la caja (signo de pesos, lupa…). */
  leading?: ReactNode;
  /** Oculta la etiqueta a la vista (sigue existiendo para lectores de pantalla). */
  hideLabel?: boolean;
}

/** Campo con etiqueta visible, ayuda y error enlazados por `aria-describedby`; el error se anuncia (RF-25). */
export function TextField({ label, error, hint, trailing, leading, hideLabel = false, className = "", ...rest }: TextFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-semibold text-ink"}>
        {label}
      </label>
      <div className={`flex min-h-12 items-center gap-2 rounded-md border bg-surface px-3.5 focus-within:border-primary ${error ? "border-2 border-danger" : "border-line-strong"}`}>
        {leading}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          className="min-h-11 w-full min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-muted focus:outline-none"
          {...rest}
        />
        {trailing}
      </div>
      {hint ? (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
