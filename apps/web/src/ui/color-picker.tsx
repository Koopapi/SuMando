// Elegir el color de un negocio (spec 002, RF-8): la paleta cerrada de 8, cada opción con su nombre (RF-14).
import { BUSINESS_COLORS, type BusinessColor } from "@/domain/business-color";
import { es } from "@/i18n";
import { Icon } from "./icons";

export function ColorPicker({ name = "color", label, hint, defaultValue }: { name?: string; label: string; hint?: string; defaultValue: BusinessColor }) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-2 text-xs font-semibold tracking-widest text-ink-muted uppercase">{label}</legend>
      <div className="grid grid-cols-4 gap-2">
        {BUSINESS_COLORS.map((c) => (
          <label
            key={c}
            className={`biz-${c} group flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-line px-1 py-2 text-xs font-medium has-checked:border-2 has-checked:border-biz has-checked:bg-biz-soft has-checked:font-bold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus`}
          >
            <input type="radio" name={name} value={c} defaultChecked={c === defaultValue} className="sr-only" />
            <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-biz text-surface">
              <Icon name="check" size={16} className="hidden group-has-checked:block" />
            </span>
            {es.businesses.colors[c]}
          </label>
        ))}
      </div>
      {hint ? <p className="text-sm text-ink-muted">{hint}</p> : null}
    </fieldset>
  );
}
