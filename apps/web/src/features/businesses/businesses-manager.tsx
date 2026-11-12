"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BusinessColor } from "@/domain/business-color";
import { es } from "@/i18n";
import type { BranchView, BusinessView } from "@/server/services/businesses";
import { Alert, Button, ColorPicker, Dialog, EmptyState, Icon, PageHeader, SectionLabel, StatusBadge, TextField } from "@/ui";
import { api, formValues } from "../api";

type Mode =
  | { kind: "create" }
  | { kind: "addBranch"; business: BusinessView }
  | { kind: "renameBusiness"; business: BusinessView }
  | { kind: "color"; business: BusinessView }
  | { kind: "renameBranch"; business: BusinessView; branch: BranchView }
  | null;

const t = es.businesses;

export function BusinessesManager({ businesses, suggestedColor }: { businesses: BusinessView[]; suggestedColor: BusinessColor }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const active = businesses.filter((b) => !b.archived);
  const archived = businesses.filter((b) => b.archived);

  async function run(path: string, init: { method?: string; body?: unknown }): Promise<boolean> {
    setBusy(true);
    setError(null);
    const result = await api(path, init);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return false;
    }
    router.refresh();
    return true;
  }

  async function submit(values: Record<string, string>) {
    if (!mode) return;
    const ok =
      mode.kind === "create"
        ? await run("/api/businesses", { body: { name: values.name, firstBranchName: values.firstBranchName, color: values.color } })
        : mode.kind === "color"
          ? await run(`/api/businesses/${mode.business.id}`, { method: "PATCH", body: { color: values.color } })
        : mode.kind === "addBranch"
          ? await run(`/api/businesses/${mode.business.id}/branches`, { body: { name: values.name } })
          : mode.kind === "renameBusiness"
            ? await run(`/api/businesses/${mode.business.id}`, { method: "PATCH", body: { name: values.name } })
            : await run(`/api/branches/${mode.branch.id}`, { method: "PATCH", body: { name: values.name } });
    if (ok) setMode(null);
  }

  const close = () => {
    setMode(null);
    setError(null);
  };

  return (
    <>
      <PageHeader title={t.title} subtitle={t.intro} figure={String(active.length)} figureLabel={t.figureLabel} action={<Button onClick={() => setMode({ kind: "create" })}>{t.create}</Button>} />
      {error && !mode ? <Alert tone="error">{error}</Alert> : null}
      {active.length === 0 ? <EmptyState title={t.emptyTitle} description={t.emptyDescription} /> : null}
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        {active.map((b) => (
          <section key={b.id} className={`biz-${b.color} flex flex-col gap-2`}>
            <div className="flex items-center gap-3.5">
              <span aria-hidden className="h-12 w-1 shrink-0 rounded-full bg-biz" />
              <div className="flex min-w-0 flex-col">
                <h2 className="truncate font-brand text-2xl font-bold tracking-tight" data-business-color={b.color}>
                  {b.name}
                </h2>
                <p className="text-ink-muted">{t.branchCount(b.branches.filter((br) => !br.archived).length)}</p>
              </div>
            </div>
            <div className="-ml-3 flex flex-wrap">
              <Button variant="ghost" aria-label={t.actionFor(t.rename, b.name)} onClick={() => setMode({ kind: "renameBusiness", business: b })}>
                {t.rename}
              </Button>
              <Button variant="ghost" aria-label={t.actionFor(t.changeColor, b.name)} onClick={() => setMode({ kind: "color", business: b })}>
                {t.changeColor}
              </Button>
              <Button variant="ghost" aria-label={t.actionFor(t.archive, b.name)} loading={busy} onClick={() => run(`/api/businesses/${b.id}/archive`, { method: "POST" })}>
                {t.archive}
              </Button>
            </div>
            <SectionLabel as="h3" className="pt-2">
              {t.branches}
            </SectionLabel>
            {b.branches.length === 0 ? <p className="text-sm text-ink-muted">{t.noBranches}</p> : null}
            <ul className="flex flex-col">
              {b.branches.map((br) => (
                <li key={br.id} className="flex min-h-13 flex-wrap items-center gap-x-2 border-b border-line py-1">
                  <span className="flex flex-1 items-center gap-2 font-semibold">
                    {br.name}
                    {br.archived ? <StatusBadge tone="warning">{t.archivedBadge}</StatusBadge> : null}
                  </span>
                  <span className="flex">
                    {br.archived ? (
                      <Button variant="ghost" aria-label={t.branchActionFor(t.reactivate, br.name, b.name)} loading={busy} onClick={() => run(`/api/branches/${br.id}/reactivate`, { method: "POST" })}>
                        {t.reactivate}
                      </Button>
                    ) : (
                      <>
                        <Button variant="ghost" aria-label={t.branchActionFor(t.rename, br.name, b.name)} onClick={() => setMode({ kind: "renameBranch", business: b, branch: br })}>
                          {t.rename}
                        </Button>
                        <Button variant="ghost" aria-label={t.branchActionFor(t.archive, br.name, b.name)} loading={busy} onClick={() => run(`/api/branches/${br.id}/archive`, { method: "POST" })}>
                          {t.archive}
                        </Button>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              aria-label={t.actionFor(t.addBranch, b.name)}
              onClick={() => setMode({ kind: "addBranch", business: b })}
              className="inline-flex min-h-12 items-center gap-2 self-start font-semibold text-primary"
            >
              <Icon name="plus" size={18} />
              {t.addBranch}
            </button>
          </section>
        ))}
      </div>
      {archived.length > 0 ? (
        <section aria-labelledby="archivados" className="flex flex-col gap-1">
          <h2 id="archivados" className="text-xs font-semibold tracking-widest text-ink-muted uppercase">
            {t.archived}
          </h2>
          <ul className="flex flex-col">
            {archived.map((b) => (
              <li key={b.id} className={`biz-${b.color} flex min-h-13 items-center gap-3 border-b border-line`}>
                <span aria-hidden className="h-6 w-1 rounded-full bg-biz opacity-50" />
                <span className="flex-1 font-semibold text-ink-muted">{b.name}</span>
                <Button variant="ghost" aria-label={t.actionFor(t.reactivate, b.name)} loading={busy} onClick={() => run(`/api/businesses/${b.id}/reactivate`, { method: "POST" })}>
                  {t.reactivate}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <Dialog
        open={mode !== null}
        onClose={close}
        title={
          mode?.kind === "create"
            ? t.createTitle
            : mode?.kind === "addBranch"
              ? t.addBranchTitle(mode.business.name)
              : mode?.kind === "renameBusiness"
                ? t.renameBusinessTitle
                : mode?.kind === "color"
                  ? t.colorTitle(mode.business.name)
                  : t.renameBranchTitle
        }
      >
        {mode ? (
          <form
            key={mode.kind + (mode.kind === "renameBranch" ? mode.branch.id : mode.kind === "create" ? "" : mode.business.id)}
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(formValues(e.currentTarget));
            }}
          >
            {error ? <Alert tone="error">{error}</Alert> : null}
            {mode.kind === "create" ? (
              <>
                <TextField label={t.businessName} name="name" required maxLength={60} autoFocus />
                <TextField label={t.firstBranchName} name="firstBranchName" required maxLength={60} />
                <ColorPicker label={t.color} hint={t.colorHint} defaultValue={suggestedColor} />
              </>
            ) : mode.kind === "color" ? (
              <ColorPicker label={t.color} hint={t.colorHint} defaultValue={mode.business.color} />
            ) : (
              <TextField
                label={mode.kind === "renameBusiness" ? t.businessName : t.branchName}
                name="name"
                required
                maxLength={60}
                autoFocus
                defaultValue={mode.kind === "renameBusiness" ? mode.business.name : mode.kind === "renameBranch" ? mode.branch.name : ""}
              />
            )}
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
