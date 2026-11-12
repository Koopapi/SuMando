import { TextField, type TextFieldProps } from "./text-field";

/** Cantidad o piezas: teclado numérico del teléfono (RF-22). */
export function NumberField(props: Omit<TextFieldProps, "inputMode" | "type">) {
  return <TextField inputMode="decimal" autoComplete="off" {...props} />;
}

/** Dinero en pesos: «$» al inicio, «MXN» al final y teclado numérico (RF-22, RF-23). */
export function MoneyField(props: Omit<TextFieldProps, "inputMode" | "type" | "leading" | "trailing">) {
  return (
    <TextField
      inputMode="decimal"
      autoComplete="off"
      leading={<span aria-hidden className="text-ink-muted">$</span>}
      trailing={<span aria-hidden className="text-sm text-ink-muted">MXN</span>}
      {...props}
    />
  );
}
