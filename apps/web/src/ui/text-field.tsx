import { useId, type InputHTMLAttributes } from "react";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string;
  hint?: string;
  trailing?: React.ReactNode;
}

/** Campo de texto con etiqueta visible, ayuda y error enlazados por `aria-describedby`. */
export function TextField({ label, error, hint, trailing, className = "", ...rest }: TextFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          className={`min-h-11 w-full rounded-md border bg-surface-raised px-3 text-base text-ink outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100 ${error ? "border-danger-600" : "border-line"} ${trailing ? "pr-12" : ""}`}
          {...rest}
        />
        {trailing ? <div className="absolute right-1">{trailing}</div> : null}
      </div>
      {hint ? (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
