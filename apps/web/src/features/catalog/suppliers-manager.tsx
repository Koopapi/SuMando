"use client";

// Spec 003 RF-27, RF-29, RF-30, RF-33, RF-34: proveedores del negocio con sus productos.
import Link from "next/link";
import { useState } from "react";
import { es } from "@/i18n";
import type { SupplierView } from "@/server/services/catalog/views";
import { Alert, Button, Dialog, EmptyState, PageHeader, SectionLabel, TextField } from "@/ui";
import { formValues } from "../api";
import { useAction } from "./use-action";

const t = es.catalog;
const ts = es.catalog.suppliers;

type Mode = { kind: "create" } | { kind: "edit"; supplier: SupplierView } | null;

export function SuppliersManager({ suppliers }: { suppliers: SupplierView[] }) {
  const { run, error, setError, busy } = useAction();
  const [mode, setMode] = useState<Mode>(null);
  const active = suppliers.filter((s) => !s.archived);
  const archived = suppliers.filter((s) => s.archived);

  const close = () => {
    setMode(null);
    setError(null);
  };

  async function submit(form: HTMLFormElement) {
    if (!mode) return;
    const v = formValues(form);
    const body = { name: v.name, phone: v.phone, notes: v.notes };
    const done = mode.kind === "create" ? await run("/api/suppliers", { body }) : await run(`/api/suppliers/${mode.supplier.id}`, { method: "PATCH", body });
    if (done) setMode(null);
  }

  const edited = mode?.kind === "edit" ? mode.supplier : null;

  return (
    <>
      <PageHeader title={ts.title} subtitle={ts.intro} figure={String(active.length)} figureLabel={ts.figureLabel} action={<Button onClick={() => setMode({ kind: "create" })}>{ts.create}</Button>} />
      {error && !mode ? <Alert tone="error">{error}</Alert> : null}
      {active.length === 0 ? <EmptyState title={ts.emptyTitle} description={ts.emptyDescription} /> : null}
      <ul className="grid gap-x-12 lg:grid-cols-2">
        {active.map((s) => (
          <li key={s.id} className="flex flex-col gap-1 border-b border-line py-3" data-supplier={s.name}>
            <div className="flex flex-wrap items-center gap-x-2">
              <h2 className="flex-1 font-brand text-xl font-bold tracking-tight">{s.name}</h2>
              <Button variant="ghost" aria-label={t.actionFor(t.edit, s.name)} onClick={() => setMode({ kind: "edit", supplier: s })}>
                {t.edit}
              </Button>
              <Button variant="ghost" aria-label={t.actionFor(t.archive, s.name)} onAction={() => run(`/api/catalog/suppliers/${s.id}/archive`)}>
                {t.archive}
              </Button>
            </div>
            {s.phone ? <p className="text-ink-muted">{s.phone}</p> : null}
            {s.notes ? <p className="text-sm text-ink-muted">{s.notes}</p> : null}
            <SectionLabel as="h3" className="pt-1">
              {ts.productCount(s.products.length)}
            </SectionLabel>
            {s.products.length === 0 ? (
              <p className="text-sm text-ink-muted">{ts.noProducts}</p>
            ) : (
              <ul aria-label={ts.productsOf(s.name)} className="flex flex-wrap gap-x-4">
                {s.products.map((p) => (
                  <li key={p.id}>
                    <Link href={`/productos/${p.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary">
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {archived.length > 0 ? (
        <section aria-label={t.archivedSection} className="flex flex-col gap-1">
          <SectionLabel>{t.archivedSection}</SectionLabel>
          <ul className="flex flex-col">
            {archived.map((s) => (
              <li key={s.id} className="flex min-h-13 items-center gap-3 border-b border-line">
                <span className="flex-1 font-semibold text-ink-muted">{s.name}</span>
                <Button variant="ghost" aria-label={t.actionFor(t.reactivate, s.name)} onAction={() => run(`/api/catalog/suppliers/${s.id}/reactivate`)}>
                  {t.reactivate}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <Dialog open={mode !== null} onClose={close} title={edited ? ts.editTitle(edited.name) : ts.createTitle}>
        {mode ? (
          <form
            key={edited?.id ?? "create"}
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(e.currentTarget);
            }}
          >
            {error ? <Alert tone="error">{error}</Alert> : null}
            <TextField label={t.name} name="name" required maxLength={80} autoFocus defaultValue={edited?.name ?? ""} />
            <TextField label={ts.phone} name="phone" type="tel" inputMode="tel" maxLength={30} hint={t.optional} defaultValue={edited?.phone ?? ""} />
            <TextField label={t.notes} name="notes" maxLength={500} hint={t.optional} defaultValue={edited?.notes ?? ""} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>
                {es.common.cancel}
              </Button>
              <Button type="submit" loading={busy}>
                {es.common.save}
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </>
  );
}
