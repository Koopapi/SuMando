"use client";

// Spec 008 RF-10, RF-11: puestos del negocio.
import Link from "next/link";
import { useState } from "react";
import { es } from "@/i18n";
import type { PositionView } from "@/server/services/personnel/positions";
import { Alert, Button, Dialog, EmptyState, PageHeader, StatusBadge, TextField } from "@/ui";
import { formValues } from "../api";
import { useAction } from "../catalog/use-action";

const t = es.personnel;

export function PositionsManager({ positions }: { positions: PositionView[] }) {
  const { run, error, setError, busy } = useAction();
  const [editing, setEditing] = useState<PositionView | "new" | null>(null);
  const current = editing && editing !== "new" ? editing : null;
  return (
    <>
      <Link href="/personal" className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
        {t.back}
      </Link>
      <PageHeader title={t.positionsTitle} subtitle={t.positionsIntro} action={<Button onClick={() => (setError(null), setEditing("new"))}>{t.addPosition}</Button>} />
      {error && !editing ? <Alert tone="error">{error}</Alert> : null}
      {positions.length === 0 ? <EmptyState title={t.noPositionsYet} /> : null}
      <ul className="flex flex-col">
        {positions.map((p) => (
          <li key={p.id} className="flex min-h-14 flex-wrap items-center gap-2 border-b border-line py-2">
            <span className="min-w-0 flex-1 font-semibold">{p.name}</span>
            {p.archived ? <StatusBadge tone="warning">{t.archivedBadge}</StatusBadge> : null}
            <Button variant="ghost" aria-label={t.actionFor(t.rename, p.name)} onClick={() => (setError(null), setEditing(p))}>
              {t.rename}
            </Button>
            <Button variant="ghost" aria-label={t.actionFor(p.archived ? t.reactivate : t.archive, p.name)} onAction={() => run(`/api/positions/${p.id}/${p.archived ? "reactivate" : "archive"}`)}>
              {p.archived ? t.reactivate : t.archive}
            </Button>
          </li>
        ))}
      </ul>
      <Dialog open={editing !== null} title={current ? t.renameTitle : t.addPosition} onClose={() => setEditing(null)}>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const name = formValues(ev.currentTarget).name;
            const ok = current ? await run(`/api/positions/${current.id}`, { method: "PATCH", body: { name } }) : await run("/api/positions", { body: { name } });
            if (ok) setEditing(null);
          }}
        >
          {error ? <Alert tone="error">{error}</Alert> : null}
          <TextField label={t.positionName} name="name" required maxLength={80} defaultValue={current?.name ?? ""} />
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
