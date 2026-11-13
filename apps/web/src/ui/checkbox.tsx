import { useId, type InputHTMLAttributes } from "react";

/** Casilla con etiqueta: toda la fila (44 px de alto) se puede tocar. */
export function Checkbox({ label, className = "", ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> & { label: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className={`flex min-h-11 cursor-pointer items-center gap-3 text-base text-ink ${className}`}>
      <input id={id} type="checkbox" className="size-6 shrink-0 accent-primary" {...rest} />
      {label}
    </label>
  );
}
