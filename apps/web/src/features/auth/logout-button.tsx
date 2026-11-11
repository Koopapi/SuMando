"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import { Button } from "@/ui";
import { api } from "../api";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        await api("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      {es.auth.logout}
    </Button>
  );
}
