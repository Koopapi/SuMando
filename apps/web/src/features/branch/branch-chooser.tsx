"use client";

// Spec 001 RF-32 a RF-36: elegir la sucursal activa. Spec 002 RF-13: el color del negocio junto a su nombre.
import { useState } from "react";
import { es } from "@/i18n";
import type { BranchChoice } from "@/server/services/active-branch";
import { Alert, Icon } from "@/ui";
import { api } from "../api";

const t = es.shell;

export function BranchChooser({ choices, activeId }: { choices: BranchChoice[]; activeId: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function choose(branchId: string) {
    setBusy(branchId);
    setError(null);
    const result = await api("/api/session/branch", { method: "PUT", body: { branchId } });
    if (!result.ok) {
      setError(result.error.message);
      setBusy(null);
      return;
    }
    // Carga completa a propósito: la sucursal activa cambia lo que muestra toda la aplicación y la caché del
    // enrutador de cliente no debe reutilizar nada de la sucursal anterior.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {choices.map((c) => (
          <section key={c.business.id} className={`biz-${c.business.color} flex flex-col gap-1`}>
            <h2 className="flex items-center gap-3 pb-2 font-brand text-xl font-bold" data-business-color={c.business.color}>
              <span aria-hidden className="h-7 w-1 rounded-full bg-biz" />
              {c.business.name}
            </h2>
            <ul className="flex flex-col">
              {c.branches.map((b) => {
                const current = b.id === activeId;
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      aria-label={current ? t.chooseCurrent(c.business.name, b.name) : t.chooseBranch(c.business.name, b.name)}
                      aria-current={current ? "true" : undefined}
                      aria-busy={busy === b.id || undefined}
                      disabled={busy !== null}
                      onClick={() => choose(b.id)}
                      className={`flex min-h-14 w-full items-center gap-3 rounded-md px-3 text-left font-semibold disabled:opacity-60 ${current ? "bg-biz-soft" : "border-b border-line hover:bg-primary-soft"}`}
                    >
                      <span className="flex-1">{`${b.name} `}</span>
                      {current ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-ink uppercase">
                          <Icon name="check" size={16} />
                          {t.current}
                        </span>
                      ) : (
                        <Icon name="chevronRight" className="text-ink-muted" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
