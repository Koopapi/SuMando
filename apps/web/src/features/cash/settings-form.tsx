"use client";

// Spec 011 RF-6 a RF-10: configuración del corte de la sucursal. Solo el dueño la cambia; el administrador la ve.
import { useState } from "react";
import { es } from "@/i18n";
import type { CashSettingsView } from "@/server/services/cash/settings";
import { Alert, Button, Checkbox, IconButton, Icon, PageHeader, SectionLabel, SelectField, TextField, useToast } from "@/ui";
import { api } from "../api";

const t = es.cash;
let seq = 0;

export function CashSettingsForm({ settings: initial }: { settings: CashSettingsView }) {
  const toast = useToast();
  const [mode, setMode] = useState(initial.mode);
  const [floorEnabled, setFloor] = useState(initial.floorEnabled);
  const [methods, setMethods] = useState(initial.methods.filter((m) => !m.isCash).map((m) => ({ key: m.id, id: m.id as string | null, name: m.name })));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ro = !initial.canEdit;

  async function save() {
    setBusy(true);
    setError(null);
    const r = await api<{ settings: CashSettingsView }>("/api/cash/settings", { method: "PUT", body: { mode, floorEnabled, methods: methods.map((m) => ({ id: m.id, name: m.name })) } });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    setMethods(r.data.settings.methods.filter((m) => !m.isCash).map((m) => ({ key: m.id, id: m.id, name: m.name })));
    toast.success(t.saved);
  }

  return (
    <>
      <PageHeader title={t.settingsTitle} subtitle={ro ? t.ownerOnlySettings : t.settingsIntro} />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <SelectField label={t.mode} value={mode} disabled={ro} onChange={(e) => setMode(e.target.value as typeof mode)} options={(["daily", "multiple"] as const).map((m) => ({ value: m, label: t.modes[m] }))} className="lg:max-w-xs" />
        <Checkbox label={t.floorEnabled} checked={floorEnabled} disabled={ro} onChange={(e) => setFloor(e.target.checked)} />
        <section aria-label={t.methods} className="flex flex-col gap-3">
          <SectionLabel as="h2">{t.methods}</SectionLabel>
          <p className="text-sm text-ink-muted">{t.methodsIntro}</p>
          <p className="font-semibold">{t.cashMethod}</p>
          <ul className="flex flex-col gap-2" data-testid="cash-methods">
            {methods.map((m, i) => (
              <li key={m.key} className="flex items-end gap-2">
                <TextField label={t.methodName} value={m.name} maxLength={40} required disabled={ro} onChange={(e) => setMethods((all) => all.map((x) => (x.key === m.key ? { ...x, name: e.target.value } : x)))} className="min-w-0 flex-1 lg:max-w-md" />
                {!ro ? (
                  <>
                    <IconButton label={t.moveUp(m.name)} onClick={() => setMethods((all) => (i === 0 ? all : [...all.slice(0, i - 1), all[i], all[i - 1], ...all.slice(i + 1)]))}>
                      <Icon name="chevronUp" />
                    </IconButton>
                    <IconButton label={t.removeMethod(m.name)} onClick={() => setMethods((all) => all.filter((x) => x.key !== m.key))}>
                      <Icon name="trash" />
                    </IconButton>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
          {!ro ? (
            <Button variant="ghost" className="self-start" onClick={() => setMethods((all) => [...all, { key: `n${++seq}`, id: null, name: "" }])}>
              {t.addMethod}
            </Button>
          ) : null}
        </section>
        {!ro ? (
          <Button type="submit" className="self-start" loading={busy}>
            {t.save}
          </Button>
        ) : null}
      </form>
    </>
  );
}
