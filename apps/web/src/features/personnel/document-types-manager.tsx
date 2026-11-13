"use client";

// Spec 008 RF-16, RF-17: la lista de documentos del negocio; solo el dueño la cambia.
import Link from "next/link";
import { useState } from "react";
import { es } from "@/i18n";
import type { DocumentTypeView } from "@/server/services/personnel/document-types";
import { Alert, Button, Checkbox, Dialog, Icon, NumberField, PageHeader, StatusBadge, TextField } from "@/ui";
import { formValues } from "../api";
import { useAction } from "../catalog/use-action";

const t = es.personnel;

export function DocumentTypesManager({ types, owner }: { types: DocumentTypeView[]; owner: boolean }) {
  const { run, error, setError, busy } = useAction();
  const [editing, setEditing] = useState<DocumentTypeView | "new" | null>(null);
  const order = types.map((d) => d.id);
  const move = (i: number, d: -1 | 1) => {
    const ids = [...order];
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    return run("/api/document-types/order", { method: "PUT", body: { ids } });
  };
  const current = editing && editing !== "new" ? editing : null;
  return (
    <>
      <Link href="/personal" className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
        {t.back}
      </Link>
      <PageHeader title={t.documentsTitle} subtitle={t.documentsIntro} action={owner ? <Button onClick={() => (setError(null), setEditing("new"))}>{t.addDocument}</Button> : undefined} />
      {!owner ? <Alert tone="info">{t.ownerOnlyHint}</Alert> : null}
      {error && !editing ? <Alert tone="error">{error}</Alert> : null}
      <ol className="flex flex-col">
        {types.map((d, i) => (
          <li key={d.id} className="flex min-h-14 flex-wrap items-center gap-2 border-b border-line py-2" data-testid="document-type">
            <span className="w-8 text-sm text-ink-muted tabular-nums">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{d.name}</span>
              <span className="block text-sm text-ink-muted">{[d.required ? t.required : t.optional, d.validityMonths ? t.validity(d.validityMonths) : t.noValidity].join(" · ")}</span>
            </span>
            {d.archived ? <StatusBadge tone="warning">{t.archivedBadge}</StatusBadge> : null}
            {owner ? (
              <>
                <Button variant="ghost" aria-label={t.moveUp(d.name)} disabled={i === 0} onAction={() => move(i, -1)}>
                  <Icon name="chevronUp" size={18} />
                </Button>
                <Button variant="ghost" aria-label={t.moveDown(d.name)} disabled={i === types.length - 1} onAction={() => move(i, 1)}>
                  <Icon name="chevronDown" size={18} />
                </Button>
                <Button variant="ghost" aria-label={t.editDocument(d.name)} onClick={() => (setError(null), setEditing(d))}>
                  {t.edit}
                </Button>
                <Button variant="ghost" aria-label={t.actionFor(d.archived ? t.reactivate : t.archive, d.name)} onAction={() => run(`/api/document-types/${d.id}/${d.archived ? "reactivate" : "archive"}`)}>
                  {d.archived ? t.reactivate : t.archive}
                </Button>
              </>
            ) : null}
          </li>
        ))}
      </ol>
      <Dialog open={editing !== null} title={current ? t.editDocument(current.name) : t.addDocument} onClose={() => setEditing(null)}>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const v = formValues(ev.currentTarget);
            const body = { name: v.name, required: v.required === "on", validityMonths: v.validityMonths ? Number(v.validityMonths) : null };
            const ok = current ? await run(`/api/document-types/${current.id}`, { method: "PATCH", body }) : await run("/api/document-types", { body });
            if (ok) setEditing(null);
          }}
        >
          {error ? <Alert tone="error">{error}</Alert> : null}
          <TextField label={t.docName} name="name" required maxLength={80} defaultValue={current?.name ?? ""} />
          <Checkbox label={t.required} name="required" defaultChecked={current?.required ?? true} />
          <NumberField label={t.validityMonths} name="validityMonths" hint={t.validityHint} defaultValue={current?.validityMonths?.toString() ?? ""} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              {t.cancel}
            </Button>
            <Button type="submit" loading={busy}>
              {t.save}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
