"use client";

// Spec 007 RF-18 a RF-20: plantillas de compra de la sucursal: usar, renombrar, archivar y reactivar.
import Link from "next/link";
import { useState } from "react";
import { es } from "@/i18n";
import type { TemplateView } from "@/server/services/requisitions/templates";
import { Alert, Button, Dialog, EmptyState, LinkButton, PageHeader, StatusBadge, TextField } from "@/ui";
import { useAction } from "../catalog/use-action";

const t = es.requisitions;

export function PurchaseTemplatesManager({ templates }: { templates: TemplateView[] }) {
  const { run, error, setError, busy } = useAction();
  const [renaming, setRenaming] = useState<TemplateView | null>(null);
  return (
    <>
      <Link href="/requisiciones" className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
        {t.back}
      </Link>
      <PageHeader title={t.templatesTitle} subtitle={t.templatesIntro} />
      {error && !renaming ? <Alert tone="error">{error}</Alert> : null}
      {templates.length === 0 ? (
        <EmptyState title={t.noTemplates} />
      ) : (
        <ul className="flex flex-col">
          {templates.map((x) => (
            <li key={x.id} className="flex min-h-14 flex-wrap items-center gap-2 border-b border-line py-2">
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{x.name}</span>
                <span className="block text-sm text-ink-muted">{t.templateLine(x.lines)}</span>
              </span>
              {x.archived ? <StatusBadge tone="warning">{t.archivedBadge}</StatusBadge> : null}
              {!x.archived ? (
                <LinkButton href={`/requisiciones/nueva?plantilla=${x.id}`} variant="secondary" label={t.useTemplate(x.name)}>
                  {t.use}
                </LinkButton>
              ) : null}
              <Button variant="ghost" aria-label={t.actionFor(t.rename, x.name)} onClick={() => (setError(null), setRenaming(x))}>
                {t.rename}
              </Button>
              <Button variant="ghost" aria-label={t.actionFor(x.archived ? t.reactivate : t.archive, x.name)} onAction={() => run(`/api/purchase-templates/${x.id}/${x.archived ? "reactivate" : "archive"}`)}>
                {x.archived ? t.reactivate : t.archive}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={renaming !== null} title={t.renameTitle} onClose={() => setRenaming(null)}>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const name = String(new FormData(e.currentTarget).get("name") ?? "");
            if (renaming && (await run(`/api/purchase-templates/${renaming.id}`, { method: "PATCH", body: { name } }))) setRenaming(null);
          }}
        >
          {error ? <Alert tone="error">{error}</Alert> : null}
          <TextField label={t.templateName} name="name" required maxLength={80} defaultValue={renaming?.name ?? ""} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRenaming(null)}>
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
