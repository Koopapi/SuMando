"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { BusinessView } from "@/server/services/businesses";
import type { PersonView } from "@/server/services/people";
import { Alert, Button, Checkbox, DataTable, Dialog, EmptyState, PageHeader, SelectField, StatusBadge, TextField, type Column, type Filter } from "@/ui";
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

  const branchesOf = (p: PersonView) => (p.role === "owner" ? t.allBranches : p.branchIds.length === 0 ? t.noBranches : p.branchIds.map((id) => branchName.get(id) ?? id).join(", "));

  const actions = (p: PersonView) => (
    <span className="-ml-3 flex flex-wrap lg:ml-0 lg:justify-end">
      {p.isActive ? (
        <>
          <Button variant="ghost" aria-label={t.actionFor(t.edit, p.name)} onClick={() => setMode({ kind: "edit", person: p })}>
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
    </span>
  );

  const columns: Column<PersonView>[] = [
    { key: "name", header: t.name, cell: (p) => p.name, phone: "title" },
    {
      key: "status",
      header: t.status,
      phone: "badge",
      cell: (p) => (
        <span className="flex flex-wrap gap-1.5">
          <StatusBadge tone={p.isActive ? "success" : "danger"}>{p.isActive ? t.active : t.inactive}</StatusBadge>
          {p.mustChangePassword && p.isActive ? <StatusBadge tone="warning">{t.pendingChange}</StatusBadge> : null}
        </span>
      ),
    },
    { key: "role", header: t.role, cell: (p) => (p.role === "owner" ? t.roleOwner : t.roleAdmin), phone: "primary" },
    { key: "branches", header: t.branches, cell: branchesOf, phone: "primary" },
    { key: "email", header: t.email, cell: (p) => p.email },
    { key: "actions", header: t.actions, cell: actions, phone: "primary", align: "end" },
  ];
  const filters: Filter<PersonView>[] = [
    { id: "active", label: t.filterActive, test: (p) => p.isActive },
    { id: "inactive", label: t.filterInactive, test: (p) => !p.isActive },
    { id: "owners", label: t.filterOwners, test: (p) => p.role === "owner" },
  ];

  return (
    <>
      <PageHeader title={t.title} subtitle={t.intro} figure={String(people.filter((p) => p.isActive).length)} figureLabel={t.figureLabel} action={<Button onClick={() => setMode({ kind: "create" })}>{t.create}</Button>} />
      {error && !mode ? <Alert tone="error">{error}</Alert> : null}
      {people.length <= 1 ? <EmptyState title={t.emptyTitle} description={t.emptyDescription} /> : null}
      <DataTable caption={t.caption} rows={people} columns={columns} rowKey={(p) => p.id} rowName={(p) => p.name} searchFields={(p) => [p.name, p.email]} searchLabel={t.search} filters={filters} />

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
            <SelectField
              label={t.role}
              name="role"
              defaultValue={mode.kind === "edit" ? mode.person.role : "admin"}
              options={[
                { value: "admin", label: t.roleAdmin },
                { value: "owner", label: t.roleOwner },
              ]}
            />
            <fieldset className="flex flex-col">
              <legend className="mb-1 text-xs font-semibold tracking-widest text-ink-muted uppercase">{t.branches}</legend>
              <p className="mb-1 text-sm text-ink-muted">{t.ownerBranchesHint}</p>
              {businesses.flatMap((b) =>
                b.branches.map((br) => (
                  <Checkbox key={br.id} name="branchIds" value={br.id} label={t.branchOption(b.name, br.name)} defaultChecked={mode.kind === "edit" && mode.person.branchIds.includes(br.id)} />
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
    </>
  );
}
