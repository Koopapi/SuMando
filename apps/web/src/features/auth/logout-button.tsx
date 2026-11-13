"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import { Button, Icon } from "@/ui";
import { api } from "../api";

/** Cerrar sesión. En el menú azul se ve como una opción más del menú. */
export function LogoutButton({ appearance = "button" }: { appearance?: "button" | "nav" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const logout = async () => {
    setBusy(true);
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };
  if (appearance === "nav") {
    return (
      <button type="button" disabled={busy} aria-busy={busy || undefined} onClick={logout} className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left font-medium text-on-band hover:bg-band-pill disabled:opacity-60">
        <Icon name="logout" className="text-band-muted" />
        {busy ? es.common.loading : es.auth.logout}
      </button>
    );
  }
  return (
    <Button variant="secondary" loading={busy} onClick={logout}>
      {es.auth.logout}
    </Button>
  );
}
