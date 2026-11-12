"use client";

// Spec 004 RF-36, RF-38: plantillas de la sucursal; se usan para empezar un cálculo, se renombran, archivan y
// reactivan.
import { useState } from "react";
import { es } from "@/i18n";
import type { TemplateView } from "@/server/services/recipes/views";
import { Alert, Button, Dialog, EmptyState, LinkButton, PageHeader, SectionLabel, TextField } from "@/ui";
import { useAction } from "../catalog/use-action";

const t = es.recipes.templates;

export function TemplatesManager({ templates }: { templates: TemplateView[] }) {
  const { run, error, setError, busy } = useAction();
  const [renaming, setRenaming] = useState<TemplateView | null>(null);
  const active = templates.filter((x) => !x.archived);
  const archived = templates.filter((x) => x.archived);
  return (
    <>
      <PageHeader title={t.title} subtitle={t.intro} figure={String(active.length)} figureLabel={t.figureLabel} />
      <span className="self-start">
        <LinkButton href="/insumos" variant="ghost" icon="arrowLeft">
          {t.back}
        </LinkButton>
      </span>
      {error && !renaming ? <Alert tone="error">{error}</Alert> : null}
      {templates.length === 0 ? <EmptyState title={t.emptyTitle} description={t.emptyDescription} /> : null}
      <ul className="flex flex-col" data-testid="templates">
        {active.map((x) => (
          <li key={x.id} className="flex min-h-13 flex-wrap items-center gap-x-2 border-b border-line py-1">
            <span className="flex-1 font-semibold">{x.name}</span>
            <span className="-ml-3 flex flex-wrap">
              <LinkButton href={`/insumos?plantilla=${x.id}`} variant="ghost" label={t.actionFor(t.use, x.name)}>
                {t.use}
              </LinkButton>
              <Button variant="ghost" aria-label={t.actionFor(t.rename, x.name)} onClick={() => setRenaming(x)}>
                {t.rename}
              </Button>
              <Button variant="ghost" aria-label={t.actionFor(t.archive, x.name)} onAction={() => run(`/api/recipe-templates/${x.id}/archive`)}>
                {t.archive}
              </Button>
            </span>
          </li>
        ))}
      </ul>
      {archived.length ? (
        <section aria-label={t.archivedSection} className="flex flex-col gap-1">
          <SectionLabel as="h2">{t.archivedSection}</SectionLabel>
          <ul className="flex flex-col">
            {archived.map((x) => (
              <li key={x.id} className="flex min-h-13 items-center gap-2 border-b border-line">
                <span className="flex-1 font-semibold text-ink-muted">{x.name}</span>
                <Button variant="ghost" aria-label={t.actionFor(t.reactivate, x.name)} onAction={() => run(`/api/recipe-templates/${x.id}/reactivate`)}>
                  {t.reactivate}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <Dialog
        open={renaming !== null}
        onClose={() => {
          setRenaming(null);
          setError(null);
        }}
        title={renaming ? t.renameTitle(renaming.name) : ""}
      >
        {renaming ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const name = String(new FormData(e.currentTarget).get("name") ?? "");
              const done = await run(`/api/recipe-templates/${renaming.id}`, { method: "PATCH", body: { name } });
              if (done) setRenaming(null);
            }}
          >
            {error ? <Alert tone="error">{error}</Alert> : null}
            <TextField label={t.name} name="name" required maxLength={80} autoFocus defaultValue={renaming.name} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRenaming(null)}>
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
