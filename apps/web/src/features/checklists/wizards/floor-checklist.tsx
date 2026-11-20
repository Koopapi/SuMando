"use client";

// Asistente «Checklist» del teléfono de piso (spec 015, RF-48, RF-49, RF-22): Elige tu nombre, un paso por cada sección
// de esa persona y Resumen de su parte. Dentro de cada sección, los puntos clave van uno por uno (con la foto cuando la
// piden) y luego los demás. Nada se registra hasta confirmar (RF-8): entonces se suben las fotos, se palomea, se guardan
// los comentarios y cada sección queda lista, con las rutas de siempre (spec 010). Lo marcado se guarda por empleado en
// ese teléfono; las fotos no viajan en lo guardado a medias, se eligen y se suben al confirmar.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { nextAfter } from "@/domain/wizards/next";
import { es } from "@/i18n";
import type { FloorEmployeeView } from "@/server/services/checklists/floor";
import type { SheetItemView, SheetSectionView, SheetView } from "@/server/services/checklists/sheets";
import { Alert, Button, Checkbox, LinkButton, LoadingState, ResumePrompt, StatusBadge, TextArea, Wizard } from "@/ui";
import { api } from "../../api";
import { useWizardDraft } from "../../wizards/use-wizard-draft";

const t = es.checklists;
const w = t.floorWizard;

export interface FloorChecklistDraft {
  /** Solo lo que la persona cambió en el asistente: lo demás es lo que ya trae la hoja. */
  marks: Record<string, boolean>;
  comments: Record<string, string>;
  /** En qué punto clave va cada sección (después del último, los demás puntos). */
  cursors: Record<string, number>;
}

const emptyDraft = (): FloorChecklistDraft => ({ marks: {}, comments: {}, cursors: {} });

/** Las secciones de la persona: las de su puesto y las que no tienen puesto; si no hay ninguna, todas. */
export function sectionsFor(sheet: SheetView): SheetSectionView[] {
  const own = sheet.sections.filter((s) => s.mine || !s.position);
  return own.length ? own : sheet.sections;
}

const keyItemsOf = (s: SheetSectionView) => s.items.filter((i) => i.isKey && i.kind !== "comment");
const restOf = (s: SheetSectionView) => s.items.filter((i) => !(i.isKey && i.kind !== "comment"));

export function FloorChecklistWizard({
  sheet: initial,
  employees,
  employee,
  autoResume,
  onEmployee,
  onFullView,
}: {
  sheet: SheetView;
  employees: FloorEmployeeView[];
  employee: string;
  autoResume: boolean;
  onEmployee: (id: string) => void;
  onFullView: () => void;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState(initial);
  const sections = sectionsFor(sheet);
  const steps = ["who", ...sections.map((s) => s.sectionId)];
  const draft = useWizardDraft<FloorChecklistDraft>({ kind: "floor-checklist", target: sheet.templateId, employee, initial: emptyDraft(), steps, autoResume });
  const d = draft.data;
  const [photos, setPhotos] = useState<Record<string, File>>({});
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const person = employees.find((e) => e.id === employee);
  const base = `/api/checklists/${sheet.templateId}/${sheet.date}`;

  if (done !== null) {
    const next = nextAfter("floor-checklist", { id: sheet.templateId });
    return (
      <div className="flex flex-col gap-4" data-testid="wizard-done">
        <Alert tone="success">{w.done(done)}</Alert>
        <div>
          <LinkButton href={next.href}>{es.common.then[next.key]}</LinkButton>
        </div>
      </div>
    );
  }
  if (!sheet.editable)
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="info">{w.notEditable}</Alert>
        <div>
          <LinkButton href="/piso" variant="secondary">
            {es.common.then.backToFloor}
          </LinkButton>
        </div>
      </div>
    );
  if (!draft.loaded) return <LoadingState />;
  if (draft.prompt) {
    const s = sections.find((x) => x.sectionId === draft.prompt!.step);
    return <ResumePrompt updatedAt={draft.prompt.updatedAt} stepTitle={s ? s.name : w.steps.who} onContinue={draft.resume} onRestart={() => void draft.restart()} />;
  }

  const set = (fn: (x: FloorChecklistDraft) => FloorChecklistDraft) => draft.update(fn);
  const isDone = (i: SheetItemView) => (i.kind === "photo" ? !!photos[i.itemId] || i.done : (d.marks[i.itemId] ?? i.done));
  const commentOf = (i: SheetItemView) => d.comments[i.itemId] ?? i.comment ?? "";
  const mark = (i: SheetItemView, value: boolean) => set((x) => ({ ...x, marks: { ...x.marks, [i.itemId]: value } }));
  const cursorOf = (s: SheetSectionView) => Math.min(d.cursors[s.sectionId] ?? 0, keyItemsOf(s).length);
  const moveTo = (s: SheetSectionView, n: number) => {
    setStepError(null);
    set((x) => ({ ...x, cursors: { ...x.cursors, [s.sectionId]: n } }));
  };
  const go = (i: number) => {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  };
  const missing = (i: SheetItemView) => (i.kind === "photo" ? w.keyPhotoRequired(i.text) : w.keyRequired(i.text));

  async function upload(i: SheetItemView, file: File) {
    const form = new FormData();
    form.set("file", file);
    form.set("employeeId", employee);
    try {
      const res = await fetch(`${base}/photo/${i.itemId}`, { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      return res.ok ? { ok: true as const, sheet: body.sheet as SheetView } : { ok: false as const, message: (body?.error?.message as string) ?? es.common.unknownError };
    } catch {
      return { ok: false as const, message: es.common.unknownError };
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    let now = sheet;
    const current = (sid: string) => now.sections.find((s) => s.sectionId === sid);
    let count = 0;
    for (const [n, s] of sections.entries()) {
      if (current(s.sectionId)?.ready ?? s.ready) continue;
      const fail = (message: string) => {
        setBusy(false);
        setSheet(now);
        // RF-10: vuelve a la sección con el mensaje y conserva lo demás.
        go(n + 1);
        setStepError(message);
      };
      for (const i of s.items) {
        const server = current(s.sectionId)?.items.find((x) => x.itemId === i.itemId) ?? i;
        let r: { ok: true; sheet: SheetView } | { ok: false; message: string } | null = null;
        if (i.kind === "photo" && photos[i.itemId]) {
          r = await upload(i, photos[i.itemId]);
          if (r.ok) setPhotos((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== i.itemId)));
        } else if (i.kind === "check" && d.marks[i.itemId] !== undefined && d.marks[i.itemId] !== server.done) {
          const x = await api<{ sheet: SheetView }>(`${base}/check`, { method: "POST", body: { itemId: i.itemId, done: d.marks[i.itemId], employeeId: employee } });
          r = x.ok ? { ok: true, sheet: x.data.sheet } : { ok: false, message: x.error.message };
        } else if (i.kind === "comment" && d.comments[i.itemId] !== undefined && d.comments[i.itemId].trim() !== (server.comment ?? "")) {
          const x = await api<{ sheet: SheetView }>(`${base}/comment`, { method: "POST", body: { itemId: i.itemId, text: d.comments[i.itemId], employeeId: employee } });
          r = x.ok ? { ok: true, sheet: x.data.sheet } : { ok: false, message: x.error.message };
        }
        if (r && !r.ok) return fail(r.message);
        if (r?.ok) now = r.sheet;
      }
      const ready = await api<{ sheet: SheetView }>(`${base}/ready`, { method: "POST", body: { sectionId: s.sectionId, employeeId: employee } });
      if (!ready.ok) return fail(ready.error.message);
      now = ready.data.sheet;
      count++;
    }
    setBusy(false);
    await draft.discard();
    setDone(count);
  }

  const errorBox = stepError ? <Alert tone="error">{stepError}</Alert> : null;

  const photoInput = (i: SheetItemView) => (
    <div className="flex flex-wrap items-center gap-3">
      <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-line-strong bg-surface px-4 font-brand font-bold text-primary hover:bg-primary-soft">
        {photos[i.itemId] || i.photoId ? t.replacePhoto : t.takePhoto}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          aria-label={t.photoFor(i.text)}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setStepError(null);
              setPhotos((p) => ({ ...p, [i.itemId]: f }));
            }
            e.target.value = "";
          }}
        />
      </label>
      {photos[i.itemId] ? <span className="text-sm text-ink-muted">{w.photoChosen(photos[i.itemId].name)}</span> : null}
      {!photos[i.itemId] && i.photoId ? (
        <a href={`/api/checklist-photos/${i.photoId}`} target="_blank" rel="noopener" className="font-semibold text-primary hover:underline" aria-label={t.seePhotoFor(i.text)}>
          {t.seePhoto}
        </a>
      ) : null}
    </div>
  );

  const itemControl = (i: SheetItemView, disabled: boolean) => {
    if (i.kind === "comment") return <TextArea label={i.text} rows={2} maxLength={500} value={commentOf(i)} disabled={disabled} onChange={(e) => set((x) => ({ ...x, comments: { ...x.comments, [i.itemId]: e.target.value } }))} />;
    if (i.kind === "photo")
      return (
        <div className="flex flex-col gap-2">
          <Checkbox label={i.text} checked={isDone(i)} disabled readOnly />
          {disabled ? null : <div className="pl-9">{photoInput(i)}</div>}
        </div>
      );
    return <Checkbox label={i.text} checked={isDone(i)} disabled={disabled} onChange={(e) => mark(i, e.target.checked)} />;
  };

  const sectionStep = (s: SheetSectionView) => {
    const keys = keyItemsOf(s);
    const rest = restOf(s);
    const cursor = cursorOf(s);
    const onKey = !s.ready && cursor < keys.length;
    const key = onKey ? keys[cursor] : null;
    return {
      id: s.sectionId,
      title: s.name,
      hint: s.ready ? w.alreadyReady : onKey ? w.hints.key : w.hints.rest,
      example: s.items[0] ? w.example(s.items[0].text) : undefined,
      validate: () => {
        if (s.ready) return true;
        if (key) {
          if (!isDone(key)) return (setStepError(missing(key)), false);
          moveTo(s, cursor + 1);
          // Quedan puntos clave o los demás puntos: se sigue dentro de la sección.
          return cursor + 1 >= keys.length && rest.length === 0;
        }
        const pending = keys.findIndex((i) => !isDone(i));
        if (pending >= 0) {
          moveTo(s, pending);
          setStepError(missing(keys[pending]));
          return false;
        }
        setStepError(null);
        return true;
      },
      content: (
        <div className="flex flex-col gap-3" data-testid="floor-section">
          {errorBox}
          {s.position ? <p className="text-sm text-ink-muted">{t.sectionPosition(s.position)}</p> : null}
          {s.ready ? <StatusBadge tone="success">{t.ready}</StatusBadge> : null}
          {key ? (
            <div className="flex flex-col gap-3 border-y border-line py-4" data-testid="floor-key-item">
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">{w.keyN(cursor + 1, keys.length)}</p>
              {key.kind === "photo" ? (
                <>
                  <p className="font-brand text-lg font-bold">{key.text}</p>
                  {photoInput(key)}
                </>
              ) : (
                <Checkbox label={key.text} checked={isDone(key)} onChange={(e) => (setStepError(null), mark(key, e.target.checked))} />
              )}
              {cursor > 0 ? (
                <Button variant="ghost" className="self-start" onClick={() => moveTo(s, cursor - 1)}>
                  {w.previousKey}
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              {keys.length && !s.ready ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-ink-muted">{w.keysDone(keys.length)}</span>
                  <Button variant="ghost" onClick={() => moveTo(s, keys.length - 1)}>
                    {w.previousKey}
                  </Button>
                </div>
              ) : null}
              <ul className="flex flex-col gap-1">
                {(s.ready ? s.items : rest).map((i) => (
                  <li key={i.itemId} className="py-1" data-testid="floor-item">
                    {itemControl(i, s.ready)}
                  </li>
                ))}
              </ul>
              {!s.ready && rest.some((i) => i.kind === "check") ? (
                <Button
                  variant="secondary"
                  className="self-start"
                  aria-label={t.allOkFor(s.name)}
                  onClick={() => set((x) => ({ ...x, marks: { ...x.marks, ...Object.fromEntries(rest.filter((i) => i.kind === "check").map((i) => [i.itemId, true])) } }))}
                >
                  {t.allOk}
                </Button>
              ) : null}
            </>
          )}
        </div>
      ),
      summary: s.ready ? (
        w.alreadyReady
      ) : (
        <ul className="flex flex-col text-sm">
          {s.items.map((i) => (
            <li key={i.itemId}>
              {i.kind === "comment"
                ? w.commentLine(i.text, commentOf(i).trim())
                : i.kind === "photo" && photos[i.itemId]
                  ? w.photoLine(i.text, photos[i.itemId].name)
                  : isDone(i)
                    ? w.doneLine(i.text)
                    : w.pendingLine(i.text, i.isKey)}
            </li>
          ))}
        </ul>
      ),
    };
  };

  const open = sections.filter((s) => !s.ready);
  return (
    <Wizard
      dirty={Object.keys(d.marks).length > 0 || Object.keys(d.comments).length > 0 || Object.keys(photos).length > 0}
      saved
      index={draft.index}
      onIndexChange={go}
      onExit={() => void draft.save().then(() => router.push("/piso"))}
      onFullView={() => void draft.save().then(onFullView)}
      onFinish={() => void confirm()}
      review={{
        confirmLabel: w.confirm,
        busy,
        canConfirm: open.length > 0,
        extra: (
          <div className="flex flex-col gap-3">
            {error ? <Alert tone="error">{error}</Alert> : null}
            {Object.keys(photos).length || open.length === 0 ? null : <Alert tone="info">{w.confirmIntro}</Alert>}
            {open.length === 0 ? <Alert tone="info">{w.nothingOpen}</Alert> : null}
          </div>
        ),
      }}
      steps={[
        {
          id: "who",
          title: w.steps.who,
          hint: w.hints.who,
          content: (
            <ul className="grid gap-2" data-testid="floor-employees">
              {employees.map((e) => (
                <li key={e.id}>
                  <Button variant={e.id === employee ? "primary" : "secondary"} full aria-pressed={e.id === employee} onClick={() => (e.id === employee ? null : onEmployee(e.id))}>
                    {e.name}
                  </Button>
                </li>
              ))}
            </ul>
          ),
          summary: person ? `${person.name} · ${person.position}` : "",
        },
        ...sections.map(sectionStep),
      ]}
    />
  );
}
