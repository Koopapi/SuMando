import { useId, type TextareaHTMLAttributes } from "react";

/** Texto largo (spec 004: modo de preparación), con la misma etiqueta, ayuda y error que `TextField`. */
export function TextArea({ label, hint, error, className = "", rows = 5, ...rest }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={`w-full rounded-md border bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none ${error ? "border-2 border-danger" : "border-line-strong"}`}
        {...rest}
      />
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
