"use client";

import { useState } from "react";
import { es } from "@/i18n";
import type { BranchChoice } from "@/server/services/active-branch";
import { Alert, Button, Card } from "@/ui";
import { api } from "../api";

const t = es.shell;

export function BranchChooser({ choices, activeId }: { choices: BranchChoice[]; activeId: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {choices.map((c) => (
        <Card key={c.business.id}>
          <h2 className={`biz-${c.business.color} mb-3 flex items-center gap-3 font-brand text-xl font-bold`} data-business-color={c.business.color}>
            <span aria-hidden className="h-7 w-1 rounded-full bg-biz" />
            {c.business.name}
          </h2>
          <ul className="flex flex-col gap-2">
            {c.branches.map((b) => (
              <li key={b.id}>
                <Button
                  variant={b.id === activeId ? "primary" : "secondary"}
                  full
                  aria-label={t.chooseBranch(c.business.name, b.name)}
                  aria-current={b.id === activeId ? "true" : undefined}
                  loading={busy === b.id}
                  onClick={async () => {
                    setBusy(b.id);
                    setError(null);
                    const result = await api("/api/session/branch", { method: "PUT", body: { branchId: b.id } });
                    if (!result.ok) {
                      setError(result.error.message);
                      setBusy(null);
                      return;
                    }
                    // Carga completa a propósito: la sucursal activa cambia lo que muestra toda la aplicación y la
                    // caché del enrutador de cliente no debe reutilizar nada de la sucursal anterior.
                    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                    window.location.assign("/");
                  }}
                >
                  {b.name}
                  {b.id === activeId ? ` · ${t.current}` : ""}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
