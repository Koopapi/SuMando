"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BusinessColor } from "@/domain/business-color";
import { es } from "@/i18n";
import type { BranchView, BusinessView } from "@/server/services/businesses";
import { Alert, Button, Card, ColorPicker, Dialog, EmptyState, TextField } from "@/ui";
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-muted">{t.intro}</p>
        <Button onClick={() => setMode({ kind: "create" })}>{t.create}</Button>
      </div>
      {error && !mode ? <Alert tone="error">{error}</Alert> : null}
      {active.length === 0 ? <EmptyState title={t.emptyTitle} description={t.emptyDescription} /> : null}
      {active.map((b) => (
        <Card key={b.id}>
          <h2 className={`biz-${b.color} mb-3 flex items-center gap-3 font-brand text-xl font-bold`} data-business-color={b.color}>
            <span aria-hidden className="h-7 w-1 rounded-full bg-biz" />
            {b.name}
          </h2>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button variant="secondary" aria-label={t.actionFor(t.addBranch, b.name)} onClick={() => setMode({ kind: "addBranch", business: b })}>
              {t.addBranch}
            </Button>
            <Button variant="secondary" aria-label={t.actionFor(t.rename, b.name)} onClick={() => setMode({ kind: "renameBusiness", business: b })}>
              {t.rename}
            </Button>
            <Button variant="secondary" aria-label={t.actionFor(t.changeColor, b.name)} onClick={() => setMode({ kind: "color", business: b })}>
              {t.changeColor}
            </Button>
            <Button variant="ghost" aria-label={t.actionFor(t.archive, b.name)} loading={busy} onClick={() => run(`/api/businesses/${b.id}/archive`, { method: "POST" })}>
              {t.archive}
            </Button>
          </div>
          <h3 className="mb-2 text-sm font-medium text-ink-muted">{t.branches}</h3>
          {b.branches.length === 0 ? <p className="text-sm text-ink-muted">{t.noBranches}</p> : null}
          <ul className="flex flex-col divide-y divide-line">
            {b.branches.map((br) => (
              <li key={br.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex items-center gap-2">
                  <span>{br.name}</span>
                  {br.archived ? <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs text-warning">{t.archivedBadge}</span> : null}
                </span>
                <span className="flex gap-1">
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
        </Card>
      ))}
      {archived.length > 0 ? (
        <Card title={t.archived}>
          <ul className="flex flex-col divide-y divide-line">
            {archived.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{b.name}</span>
                <Button variant="ghost" aria-label={t.actionFor(t.reactivate, b.name)} loading={busy} onClick={() => run(`/api/businesses/${b.id}/reactivate`, { method: "POST" })}>
                  {t.reactivate}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
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
    </div>
  );
}
