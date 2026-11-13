"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import { Alert, Button, PasswordField, TextField } from "@/ui";
import { api, formValues } from "../api";

export function SetupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const result = await api("/api/setup", { body: formValues(e.currentTarget) });
        if (!result.ok) {
          setError(result.error.message);
          setBusy(false);
          return;
        }
        router.push("/");
        router.refresh();
      }}
    >
      {error ? <Alert tone="error">{error}</Alert> : null}
      <TextField label={es.auth.name} name="name" autoComplete="name" required maxLength={60} />
      <TextField label={es.auth.email} name="email" type="email" autoComplete="email" inputMode="email" required />
      <PasswordField label={es.auth.password} name="password" autoComplete="new-password" hint={es.auth.passwordHint} required />
      <Button type="submit" loading={busy} full>
        {es.auth.create}
      </Button>
    </form>
  );
}
