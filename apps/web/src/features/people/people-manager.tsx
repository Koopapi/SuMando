"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { BusinessView } from "@/server/services/businesses";
import type { PersonView } from "@/server/services/people";
import { Alert, Button, Card, Dialog, EmptyState, TextField } from "@/ui";
import { api, formValues } from "../api";

type Mode = { kind: "create" } | { kind: "edit"; person: PersonView } | null;

const t = es.people;

export function PeopleManager({ people, businesses, selfId }: { people: PersonView[]; businesses: BusinessView[]; selfId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [temporary, setTemporary] = useState<{ name: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const branchName = new Map(businesses.flatMap((b) => b.branches.map((br) => [br.id, t.branchOption(b.name, br.name)] as const)));

  async function run<T>(path: string, init: { method?: string; body?: unknown }): Promise<T | null> {
    setBusy(true);
    setError(null);
    const result = await api<T>(path, init);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return null;
    }
    router.refresh();
    return result.data;
  }

  function showTemporary(name: string, password: string) {
    setCopied(false);
    setTemporary({ name, password });
  }

  async function submit(form: HTMLFormElement) {
    if (!mode) return;
    const values = formValues(form);
    const branchIds = [...new FormData(form).getAll("branchIds")].map(String);
    if (mode.kind === "create") {
      const data = await run<{ person: PersonView; temporaryPassword: string }>("/api/people", { body: { name: values.name, email: values.email, role: values.role, branchIds } });
      if (data) {
        setMode(null);
        showTemporary(data.person.name, data.temporaryPassword);
      }
    } else {
      const data = await run(`/api/people/${mode.person.id}`, { method: "PATCH", body: { name: values.name, role: values.role, branchIds } });
      if (data !== null) setMode(null);
    }
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
      {people.length <= 1 ? <EmptyState title={t.emptyTitle} description={t.emptyDescription} /> : null}
      <ul className="flex flex-col gap-3">
        {people.map((p) => (
          <li key={p.id}>
            <Card as="article">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  <p className="text-sm text-ink-muted">{p.email}</p>
                  <p className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-md bg-primary-soft px-2 py-0.5 text-primary">{p.role === "owner" ? t.roleOwner : t.roleAdmin}</span>
                    <span className={`rounded-md px-2 py-0.5 ${p.isActive ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{p.isActive ? t.active : t.inactive}</span>
                    {p.mustChangePassword && p.isActive ? <span className="rounded-md bg-warning-soft px-2 py-0.5 text-warning">{t.pendingChange}</span> : null}
                  </p>
                  <p className="text-sm">
                    {p.role === "owner" ? t.allBranches : p.branchIds.length === 0 ? t.noBranches : p.branchIds.map((id) => branchName.get(id) ?? id).join(", ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.isActive ? (
                    <>
                      <Button variant="secondary" aria-label={t.actionFor(t.edit, p.name)} onClick={() => setMode({ kind: "edit", person: p })}>
                        {t.edit}
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={t.actionFor(t.resetPassword, p.name)}
                        loading={busy}
                        onClick={async () => {
                          const data = await run<{ temporaryPassword: string }>(`/api/people/${p.id}/reset-password`, { method: "POST" });
                          if (data) showTemporary(p.name, data.temporaryPassword);
                        }}
                      >
                        {t.resetPassword}
                      </Button>
                      {p.id !== selfId ? (
                        <Button variant="ghost" aria-label={t.actionFor(t.deactivate, p.name)} loading={busy} onClick={() => run(`/api/people/${p.id}/deactivate`, { method: "POST" })}>
                          {t.deactivate}
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      aria-label={t.actionFor(t.reactivate, p.name)}
                      loading={busy}
                      onClick={async () => {
                        const data = await run<{ temporaryPassword: string }>(`/api/people/${p.id}/reactivate`, { method: "POST" });
                        if (data) showTemporary(p.name, data.temporaryPassword);
                      }}
                    >
                      {t.reactivate}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog open={mode !== null} onClose={close} title={mode?.kind === "edit" ? t.editTitle(mode.person.name) : t.createTitle}>
        {mode ? (
          <form
            key={mode.kind === "edit" ? mode.person.id : "create"}
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(e.currentTarget);
            }}
          >
            {error ? <Alert tone="error">{error}</Alert> : null}
            <TextField label={t.name} name="name" required maxLength={60} autoFocus defaultValue={mode.kind === "edit" ? mode.person.name : ""} />
            {mode.kind === "create" ? <TextField label={t.email} name="email" type="email" inputMode="email" required /> : null}
            <label className="flex flex-col gap-1 text-sm font-medium">
              {t.role}
              <select name="role" defaultValue={mode.kind === "edit" ? mode.person.role : "admin"} className="min-h-11 rounded-md border border-line bg-surface px-3 text-base font-normal">
                <option value="admin">{t.roleAdmin}</option>
                <option value="owner">{t.roleOwner}</option>
              </select>
            </label>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">{t.branches}</legend>
              <p className="text-xs text-ink-muted">{t.ownerBranchesHint}</p>
              {businesses.flatMap((b) =>
                b.branches.map((br) => (
                  <label key={br.id} className="flex min-h-9 items-center gap-2 text-sm">
                    <input type="checkbox" name="branchIds" value={br.id} defaultChecked={mode.kind === "edit" && mode.person.branchIds.includes(br.id)} className="size-4" />
                    {t.branchOption(b.name, br.name)}
                  </label>
                )),
              )}
            </fieldset>
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

      <Dialog open={temporary !== null} onClose={() => setTemporary(null)} title={t.temporaryTitle}>
        {temporary ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-muted">{t.temporaryIntro(temporary.name)}</p>
            <p className="rounded-md bg-primary-soft px-4 py-3 text-center font-mono text-2xl tracking-widest" data-testid="temporary-password">
              {temporary.password}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard?.writeText(temporary.password).catch(() => undefined);
                  setCopied(true);
                }}
              >
                {copied ? es.common.copied : es.common.copy}
              </Button>
              <Button onClick={() => setTemporary(null)}>{es.common.done}</Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
