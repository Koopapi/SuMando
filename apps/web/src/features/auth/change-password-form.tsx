"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import { Alert, Button, PasswordField } from "@/ui";
import { api, formValues } from "../api";

export function ChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const values = formValues(e.currentTarget);
        setError(null);
        if (values.newPassword !== values.confirmPassword) {
          setError(es.auth.confirmMismatch);
          return;
        }
        setBusy(true);
        const result = await api("/api/auth/password", { body: { currentPassword: values.currentPassword, newPassword: values.newPassword } });
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
      <PasswordField label={es.auth.currentPassword} name="currentPassword" autoComplete="current-password" required />
      <PasswordField label={es.auth.newPassword} name="newPassword" autoComplete="new-password" hint={es.auth.passwordHint} required />
      <PasswordField label={es.auth.confirmPassword} name="confirmPassword" autoComplete="new-password" required />
      <Button type="submit" loading={busy} full>
        {es.auth.save}
      </Button>
    </form>
  );
}
