import { useId, type SelectHTMLAttributes } from "react";
import { Icon } from "./icons";

/** Selector nativo con etiqueta visible: en el teléfono abre la lista del sistema. */
export function SelectField({ label, options, error, className = "", ...rest }: Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & { label: string; options: { value: string; label: string }[]; error?: string }) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className={`relative flex min-h-12 items-center rounded-md border bg-surface ${error ? "border-2 border-danger" : "border-line-strong"}`}>
        <select id={id} aria-invalid={error ? true : undefined} aria-describedby={errorId} className="min-h-11 w-full appearance-none bg-transparent px-3.5 pr-10 text-base text-ink focus:outline-none" {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" className="pointer-events-none absolute right-3 text-ink-muted" />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
