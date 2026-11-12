"use client";

// Demostraciones interactivas del catálogo (spec 002, RF-40). Datos de ejemplo: nada se guarda.
import { useState, type FormEvent } from "react";
import { BUSINESS_COLORS } from "@/domain/business-color";
import { es } from "@/i18n";
import { Alert, BusinessBadge, Button, Checkbox, Dialog, IconButton, Icon, MoneyField, NumberField, SectionLabel, SelectField, StatusBadge, TextField, useToast } from "@/ui";

const t = es.system;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-line pt-6">
      <h2 id={id} className="font-brand text-xl font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ActionsDemo() {
  const [saves, setSaves] = useState(0);
  return (
    <Section id="acciones" title={t.actions}>
      <div className="flex flex-wrap items-center gap-3">
        <Button>{t.primary}</Button>
        <Button variant="secondary">{t.secondary}</Button>
        <Button variant="ghost">{t.ghost}</Button>
        <Button variant="danger">{t.danger}</Button>
        <Button disabled>{t.disabled}</Button>
        <IconButton label={t.menu}>
          <Icon name="menu" />
        </IconButton>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          data-testid="busy-button"
          onAction={async () => {
            await wait(800);
            setSaves((n) => n + 1);
          }}
        >
          {t.busyDemo}
        </Button>
        <span data-testid="saves" className="text-ink-muted">
          {t.saves(saves)}
        </span>
      </div>
    </Section>
  );
}

export function FormsDemo() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  function validate(e: FormEvent) {
    e.preventDefault();
    setError(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? undefined : t.emailError);
  }
  return (
    <Section id="formularios" title={t.forms}>
      <div className="grid gap-4 lg:grid-cols-2">
        <TextField label={t.businessName} hint={t.businessHint} defaultValue="Pirrus" />
        <form onSubmit={validate} noValidate className="flex flex-col gap-3">
          <TextField label={t.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <Button type="submit" variant="secondary">
            {t.validate}
          </Button>
        </form>
        <NumberField label={t.pieces} defaultValue="12" />
        <MoneyField label={t.cash} defaultValue="1,500.00" />
        <SelectField label={t.branch} options={t.branches.map((b) => ({ value: b, label: b }))} />
        <Checkbox label={t.owner} defaultChecked />
      </div>
    </Section>
  );
}

export function AlertsDemo() {
  const toast = useToast();
  return (
    <>
      <Section id="avisos" title={t.alerts}>
        <div className="flex flex-col gap-3">
          <Alert tone="info">{t.alertInfo}</Alert>
          <Alert tone="success">{t.alertSuccess}</Alert>
          <Alert tone="warning">{t.alertWarning}</Alert>
          <Alert tone="error">{t.alertError}</Alert>
        </div>
      </Section>
      <Section id="flotantes" title={t.toasts}>
        <TextField label={t.note} />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast.success(t.savedMessage)}>
            {t.showSaved}
          </Button>
          <Button variant="secondary" onClick={() => toast.error(t.errorMessage)}>
            {t.showError}
          </Button>
        </div>
      </Section>
    </>
  );
}

export function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Section id="dialogo" title={t.dialogs}>
      <div>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {t.openDialog}
        </Button>
      </div>
      <Dialog open={open} title={t.dialogTitle} onClose={() => setOpen(false)}>
        <p className="text-ink-muted">{t.dialogBody}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {t.keepGoing}
          </Button>
          <Button variant="danger" onClick={() => setOpen(false)}>
            {t.leave}
          </Button>
        </div>
      </Dialog>
    </Section>
  );
}

export function BadgesDemo() {
  return (
    <Section id="insignias" title={t.badges}>
      <SectionLabel as="p">{t.sectionLabel}</SectionLabel>
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone="success">{t.statusActive}</StatusBadge>
        <StatusBadge tone="warning">{t.statusLow}</StatusBadge>
        <StatusBadge tone="danger">{t.statusOff}</StatusBadge>
        <StatusBadge tone="warning">{t.statusTemp}</StatusBadge>
      </div>
      <div className="flex flex-wrap gap-2">
        {BUSINESS_COLORS.map((c) => (
          <BusinessBadge key={c} color={c}>
            {es.businesses.colors[c]}
          </BusinessBadge>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 rounded-lg bg-band p-4">
        {BUSINESS_COLORS.map((c) => (
          <BusinessBadge key={c} color={c} tone="band">
            {es.businesses.colors[c]}
          </BusinessBadge>
        ))}
      </div>
    </Section>
  );
}
