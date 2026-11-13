"use client";

import { useState } from "react";
import { es } from "@/i18n";
import { Alert, Button, PasswordField, TextField } from "@/ui";
import { api, formValues } from "../api";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const result = await api<{ next: string }>("/api/auth/login", { body: formValues(e.currentTarget) });
        if (!result.ok) {
          setError(result.error.message);
          setBusy(false);
          return;
        }
        // Carga completa a propósito: la sesión nueva cambia toda la aplicación (estructura, sucursal activa) y la
        // caché del enrutador de cliente no debe reutilizar nada de antes de entrar.
        window.location.assign(result.data.next);
      }}
    >
      {error ? <Alert tone="error">{error}</Alert> : null}
      <TextField label={es.auth.email} name="email" type="email" autoComplete="email" inputMode="email" required />
      <PasswordField label={es.auth.password} name="password" autoComplete="current-password" required />
      <Button type="submit" loading={busy} full>
        {es.auth.login}
      </Button>
    </form>
  );
}
