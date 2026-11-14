"use client";

// Spec 010 RF-37, RF-43, RF-44: teléfonos de piso de la sucursal; habilitar este teléfono lo deja solo para
// checklists (se cierra la sesión de la persona en él) y lo manda a `/piso`.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { FloorDeviceView } from "@/server/services/checklists/floor";
import { Alert, Button, EmptyState, PageHeader, SectionLabel, StatusBadge, TextField, formatDateTime } from "@/ui";
import { api } from "../api";

const t = es.checklists;
const at = (iso: string) => formatDateTime(new Date(iso));

export function DevicesManager({ devices: initial }: { devices: FloorDeviceView[] }) {
  const router = useRouter();
  const [devices, setDevices] = useState(initial);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function enable() {
    setBusy(true);
    setError(null);
    const r = await api("/api/floor-devices", { body: { name } });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    router.push("/piso");
    router.refresh();
  }

  async function disable(id: string) {
    setError(null);
    const r = await api<{ devices: FloorDeviceView[] }>(`/api/floor-devices/${id}/disable`, { body: {} });
    if (!r.ok) return setError(r.error.message);
    setDevices(r.data.devices);
  }

  return (
    <>
      <PageHeader title={t.devicesTitle} subtitle={t.devicesIntro} />
      {error ? <Alert tone="error">{error}</Alert> : null}
      {devices.length === 0 ? (
        <EmptyState title={t.devicesEmpty} />
      ) : (
        <ul className="flex flex-col" data-testid="floor-devices">
          {devices.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 border-b border-line py-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{d.name}</span>
                <span className="text-sm text-ink-muted">{t.deviceLine(d.enabledBy, at(d.createdAt), d.lastUsedAt ? at(d.lastUsedAt) : null)}</span>
              </span>
              {d.disabledAt ? (
                <StatusBadge tone="neutral">{t.disabledBadge}</StatusBadge>
              ) : (
                <Button variant="secondary" aria-label={t.disableFor(d.name)} onAction={() => disable(d.id)}>
                  {t.disable}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <section aria-label={t.enableTitle} className="flex flex-col gap-3">
        <SectionLabel as="h2">{t.enableTitle}</SectionLabel>
        <p className="text-sm text-ink-muted">{t.enableIntro}</p>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void enable();
          }}
        >
          <TextField label={t.deviceName} hint={t.deviceNameHint} value={name} maxLength={40} required onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 lg:max-w-md" />
          <Button type="submit" loading={busy}>
            {t.enable}
          </Button>
        </form>
      </section>
    </>
  );
}
