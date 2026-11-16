"use client";

// Spec 010: la hoja del día. La usan las personas (`/checklists/...`) y el teléfono de piso (`/piso/...`); cada
// acción vuelve con la hoja que arma el servidor. Reabrir y cerrar solo aparecen para personas (RF-45).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { SheetItemView, SheetSectionView, SheetView } from "@/server/services/checklists/sheets";
import { Alert, Button, Checkbox, Dialog, SectionLabel, StatusBadge, TextArea, formatDateTime, useToast } from "@/ui";
import { api } from "../api";

const t = es.checklists;

const at = (iso: string | null) => (iso ? formatDateTime(new Date(iso)) : "");

export function SheetBoard({ sheet: initial, mode, employeeId }: { sheet: SheetView; mode: "user" | "device"; employeeId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [sheet, setSheet] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const base = `/api/checklists/${sheet.templateId}/${sheet.date}`;
  const person = mode === "user";

  async function act(action: string, body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    const r = await api<{ sheet: SheetView }>(`${base}/${action}`, { method: "POST", body: { ...body, employeeId } });
    setBusy(null);
    if (!r.ok) {
      setError(r.error.message);
      return false;
    }
    setSheet(r.data.sheet);
    return true;
  }

  async function photo(item: SheetItemView, file: File) {
    const form = new FormData();
    form.set("file", file);
    if (employeeId) form.set("employeeId", employeeId);
    setBusy(item.itemId);
    setError(null);
    try {
      const res = await fetch(`${base}/photo/${item.itemId}`, { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      setBusy(null);
      if (!res.ok) return setError(body?.error?.message ?? es.common.unknownError);
      setSheet(body.sheet);
    } catch {
      setBusy(null);
      setError(es.common.unknownError);
    }
  }

  const mine = sheet.sections.filter((s) => s.mine);
  const others = sheet.sections.filter((s) => !s.mine);
  const groups = mine.length ? ([[t.sectionMine, mine], [t.sectionOthers, others]] as const) : ([[null, others]] as const);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={sheet.status === "closed" ? "success" : sheet.status === "open" ? "warning" : "neutral"}>{t.statuses[sheet.status]}</StatusBadge>
        {person && sheet.status !== "closed" && (sheet.today || sheet.status === "open") ? (
          <Button variant="secondary" onClick={() => (setError(null), setClosing(true))}>
            {t.close}
          </Button>
        ) : null}
      </div>
      {sheet.status === "closed" && sheet.closedAt ? <p className="text-sm text-ink-muted">{t.closedLine(at(sheet.closedAt), sheet.closedBy)}</p> : null}
      {!sheet.today && sheet.status === "open" ? <Alert tone="warning">{t.pastOpen}</Alert> : null}
      {sheet.pending?.length ? (
        <Alert tone="warning" title={t.pendingTitle}>
          <ul className="flex flex-col gap-1" data-testid="sheet-pending">
            {sheet.pending.map((p) => (
              <li key={p.sectionId}>{t.pendingLine(p.name, p.keyItems)}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {error && !closing ? <Alert tone="error">{error}</Alert> : null}

      {groups.map(([label, list]) => (
        <div key={label ?? "all"} className="flex flex-col gap-4">
          {label && list.length ? <SectionLabel as="h2">{label}</SectionLabel> : null}
          {list.map((s) => (
            <Section key={s.sectionId} s={s} sheet={sheet} person={person} busy={busy} act={act} photo={photo} toast={() => toast.success(t.saved)} />
          ))}
        </div>
      ))}

      <Dialog open={closing} title={t.closeTitle} onClose={() => setClosing(false)}>
        <div className="flex flex-col gap-4">
          <p>{t.closeIntro}</p>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              loading={busy === "close"}
              onClick={() =>
                void act("close", {}, "close").then((ok) => {
                  if (ok) {
                    setClosing(false);
                    router.refresh();
                  }
                })
              }
            >
              {t.closeConfirm}
            </Button>
            <Button variant="ghost" onClick={() => setClosing(false)}>
              {t.cancel}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function Section({
  s,
  sheet,
  person,
  busy,
  act,
  photo,
  toast,
}: {
  s: SheetSectionView;
  sheet: SheetView;
  person: boolean;
  busy: string | null;
  act: (action: string, body: Record<string, unknown>, key: string) => Promise<boolean>;
  photo: (item: SheetItemView, file: File) => Promise<void>;
  toast: () => void;
}) {
  const editable = sheet.editable && !s.ready;
  return (
    <section aria-label={s.name} className="flex flex-col gap-2 border-b border-line pb-4" data-testid="sheet-section">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 font-brand text-xl font-bold">{s.name}</h3>
        <span className="text-sm text-ink-muted tabular-nums">{t.sectionProgress(s.done, s.total)}</span>
        {s.ready ? <StatusBadge tone="success">{t.ready}</StatusBadge> : null}
      </div>
      {s.position ? <p className="text-sm text-ink-muted">{t.sectionPosition(s.position)}</p> : null}
      {s.ready && s.readyBy ? <p className="text-sm text-ink-muted">{t.readyLine(s.readyBy, at(s.readyAt), s.readyDevice)}</p> : null}
      <ul className="flex flex-col">
        {s.items.map((i) => (
          <Item key={i.itemId} i={i} editable={editable} busy={busy === i.itemId} act={act} photo={photo} toast={toast} />
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {editable ? (
          <>
            <Button variant="secondary" aria-label={t.allOkFor(s.name)} loading={busy === `ok:${s.sectionId}`} onClick={() => void act("all-ok", { sectionId: s.sectionId }, `ok:${s.sectionId}`)}>
              {t.allOk}
            </Button>
            <Button aria-label={t.markReadyFor(s.name)} loading={busy === `ready:${s.sectionId}`} disabled={s.keyPending > 0} onClick={() => void act("ready", { sectionId: s.sectionId }, `ready:${s.sectionId}`)}>
              {t.markReady}
            </Button>
            {s.keyPending > 0 ? <span className="self-center text-sm text-warning">{t.keyMissing(s.keyPending)}</span> : null}
          </>
        ) : null}
        {person && s.ready && sheet.status !== "new" ? (
          <Button variant="ghost" aria-label={t.reopenFor(s.name)} loading={busy === `reopen:${s.sectionId}`} onClick={() => void act("reopen-section", { sectionId: s.sectionId }, `reopen:${s.sectionId}`)}>
            {t.reopen}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function Item({
  i,
  editable,
  busy,
  act,
  photo,
  toast,
}: {
  i: SheetItemView;
  editable: boolean;
  busy: boolean;
  act: (action: string, body: Record<string, unknown>, key: string) => Promise<boolean>;
  photo: (item: SheetItemView, file: File) => Promise<void>;
  toast: () => void;
}) {
  const [comment, setComment] = useState(i.comment ?? "");
  const marks = (
    <span className="flex flex-wrap gap-1">
      {i.isKey ? <StatusBadge tone="danger">{t.keyMark}</StatusBadge> : null}
      {i.kind === "photo" ? <StatusBadge tone="neutral">{t.photoMark}</StatusBadge> : null}
    </span>
  );
  const who = i.markedBy && (i.done || i.comment) ? <p className="text-sm text-ink-muted">{t.markedLine(i.markedBy, at(i.markedAt), i.device)}</p> : null;
  if (i.kind === "comment") {
    return (
      <li className="flex flex-col gap-2 py-2" data-testid="sheet-item">
        <TextArea label={i.text} rows={2} maxLength={500} value={comment} disabled={!editable} onChange={(e) => setComment(e.target.value)} />
        {editable ? (
          <Button variant="secondary" className="self-start" aria-label={t.saveCommentFor(i.text)} loading={busy} onClick={() => void act("comment", { itemId: i.itemId, text: comment }, i.itemId).then((ok) => ok && toast())}>
            {t.saveComment}
          </Button>
        ) : null}
        {who}
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-1 py-1" data-testid="sheet-item">
      <div className="flex flex-wrap items-center gap-2">
        <Checkbox
          label={i.text}
          checked={i.done}
          disabled={!editable || busy || (i.kind === "photo" && !i.photoId && !i.done)}
          onChange={(e) => void act("check", { itemId: i.itemId, done: e.target.checked }, i.itemId)}
          className="min-w-0 flex-1"
        />
        {marks}
      </div>
      {i.kind === "photo" ? (
        <div className="flex flex-wrap items-center gap-3 pl-9">
          {editable ? (
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-line-strong bg-surface px-4 font-brand font-bold text-primary hover:bg-primary-soft">
              {i.photoId ? t.replacePhoto : t.takePhoto}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                aria-label={t.photoFor(i.text)}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void photo(i, f);
                  e.target.value = "";
                }}
              />
            </label>
          ) : null}
          {i.photoId ? (
            <a href={`/api/checklist-photos/${i.photoId}`} target="_blank" rel="noopener" className="font-semibold text-primary hover:underline" aria-label={t.seePhotoFor(i.text)}>
              {t.seePhoto}
            </a>
          ) : null}
        </div>
      ) : null}
      {who ? <div className="pl-9">{who}</div> : null}
    </li>
  );
}
