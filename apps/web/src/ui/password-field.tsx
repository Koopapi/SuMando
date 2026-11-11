"use client";

import { useState } from "react";
import { es } from "@/i18n";
import { TextField, type TextFieldProps } from "./text-field";

/** Campo de contraseña con botón para mostrarla u ocultarla. */
export function PasswordField(props: Omit<TextFieldProps, "type" | "trailing">) {
  const [shown, setShown] = useState(false);
  return (
    <TextField
      type={shown ? "text" : "password"}
      trailing={
        <button
          type="button"
          aria-label={shown ? es.common.hidePassword : es.common.showPassword}
          aria-pressed={shown}
          onClick={() => setShown((s) => !s)}
          className="min-h-9 rounded-md px-2 text-sm text-brand-700 hover:bg-brand-50"
        >
          {shown ? es.common.hide : es.common.show}
        </button>
      }
      {...props}
    />
  );
}
