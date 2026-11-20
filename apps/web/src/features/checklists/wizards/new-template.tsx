"use client";

// Asistente «Nueva plantilla de checklist» (spec 015, RF-47): Nombre, días y sucursales; Secciones; un paso con los
// puntos de cada sección (tipo y si es clave) y Resumen. Guarda de una vez con `/api/checklist-templates`, como el
// editor de plantillas.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { nextAfter } from "@/domain/wizards/next";
import { es } from "@/i18n";
import { Alert, Button, Checkbox, Icon, IconButton, LinkButton, LoadingState, ResumePrompt, SelectField, TextField, Wizard } from "@/ui";
import { api } from "../../api";
import { useWizardDraft } from "../../wizards/use-wizard-draft";
import { switchView, viewHref } from "../../wizards/view-switch";

const t = es.checklists;
const w = t.templateWizard;

type Kind = "check" | "photo" | "comment";
interface Item {
  key: number;
  text: string;
  kind: Kind;
  isKey: boolean;
}
interface Section {
  key: number;
  name: string;
  positionId: string;
  items: Item[];
}

export interface NewTemplateDraft {
  name: string;
  days: number[];
  branchIds: string[];
  sections: Section[];
  next: number;
}

export const emptyTemplate = (branches: { id: string }[]): NewTemplateDraft => ({ name: "", days: [0, 1, 2, 3, 4, 5, 6], branchIds: branches.length === 1 ? [branches[0].id] : [], sections: [], next: 1 });

export function NewTemplateWizard({ branches, positions, autoResume }: { branches: { id: string; name: string }[]; positions: { id: string; name: string }[]; autoResume: boolean }) {
  const router = useRouter();
  const [steps, setSteps] = useState<string[]>(() => ["basics", "sections"]);
  const draft = useWizardDraft<NewTemplateDraft>({ kind: "new-checklist", initial: emptyTemplate(branches), steps, autoResume });
  const d = draft.data;
  const [stepError, setStepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; name: string } | null>(null);
  const named = d.sections.filter((s) => s.name.trim());
  const wanted = ["basics", "sections", ...named.map((s) => `section-${s.key}`)];
  if (wanted.join() !== steps.join()) setSteps(wanted);

  if (done) {
    const next = nextAfter("new-checklist", { id: done.id });
    return (
      <div className="flex flex-col gap-4" data-testid="wizard-done">
        <Alert tone="success">{w.done(done.name)}</Alert>
        <div>
          <LinkButton href={next.href}>{es.common.then[next.key]}</LinkButton>
        </div>
      </div>
    );
  }
  if (!draft.loaded) return <LoadingState />;
  if (draft.prompt) {
    const section = d.sections.find((s) => `section-${s.key}` === draft.prompt!.step) ?? draft.prompt.data.sections?.find((s) => `section-${s.key}` === draft.prompt!.step);
    return <ResumePrompt updatedAt={draft.prompt.updatedAt} stepTitle={section ? w.itemsOf(section.name) : (w.steps[draft.prompt.step as keyof typeof w.steps] ?? w.steps.basics)} onContinue={draft.resume} onRestart={() => void draft.restart()} />;
  }

  const set = (patch: Partial<NewTemplateDraft>) => draft.update((x) => ({ ...x, ...patch }));
  const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
  const patchSection = (key: number, patch: Partial<Section>) => set({ sections: d.sections.map((s) => (s.key === key ? { ...s, ...patch } : s)) });
  const patchItem = (sk: number, ik: number, patch: Partial<Item>) => set({ sections: d.sections.map((s) => (s.key === sk ? { ...s, items: s.items.map((i) => (i.key === ik ? { ...i, ...patch } : i)) } : s)) });
  const filledItems = (s: Section) => s.items.filter((i) => i.text.trim());
  const go = (i: number) => {
    setStepError(null);
    setError(null);
    draft.setIndex(i);
  };
  const fail = (message: string) => (setStepError(message), false);

  async function confirm() {
    setBusy(true);
    setError(null);
    const body = {
      name: d.name,
      days: [...d.days].sort(),
      branchIds: d.branchIds,
      sections: named.map((s) => ({ id: null, name: s.name.trim(), positionId: s.positionId || null, items: filledItems(s).map((i) => ({ id: null, text: i.text.trim(), kind: i.kind, isKey: i.kind !== "comment" && i.isKey })) })),
    };
    const r = await api<{ template: { id: string; name: string } }>("/api/checklist-templates", { body });
    setBusy(false);
    if (!r.ok) {
      if (/name|days|branch/.test(r.error.code)) go(0);
      else if (/section|item/.test(r.error.code)) go(1);
      else return setError(r.error.message);
      setStepError(r.error.message);
      return;
    }
    await draft.discard();
    setDone({ id: r.data.template.id, name: r.data.template.name });
  }

  const errorBox = stepError ? <Alert tone="error">{stepError}</Alert> : null;
  const days = t.dayNames.filter((_, i) => d.days.includes(i)).join(", ");
  return (
    <Wizard
      dirty={d.name.trim() !== "" || d.sections.length > 0}
      saved
      index={draft.index}
      onIndexChange={go}
      onExit={() => router.push("/checklists/plantillas")}
      onFullView={() => void switchView("new-checklist", "full", draft.save).then(() => router.push(viewHref("/checklists/plantillas/nueva", "full")))}
      onFinish={() => void confirm()}
      review={{ confirmLabel: w.confirm, busy, extra: error ? <Alert tone="error">{error}</Alert> : null }}
      steps={[
        {
          id: "basics",
          title: w.steps.basics,
          hint: w.hints.basics,
          example: w.examples.basics,
          validate: () => (!d.name.trim() ? fail(w.nameRequired) : !d.days.length ? fail(w.daysRequired) : !d.branchIds.length ? fail(w.branchesRequired) : (setStepError(null), true)),
          content: (
            <div className="flex flex-col gap-4">
              {errorBox}
              <TextField label={t.name} maxLength={80} value={d.name} onChange={(e) => set({ name: e.target.value })} />
              <fieldset className="flex flex-col gap-1">
                <legend className="text-sm font-semibold">{t.days}</legend>
                <div className="flex flex-wrap gap-x-4">
                  {t.dayNames.map((day, i) => (
                    <Checkbox key={day} label={day} checked={d.days.includes(i)} onChange={() => set({ days: toggle(d.days, i) })} />
                  ))}
                </div>
              </fieldset>
              <fieldset className="flex flex-col gap-1">
                <legend className="text-sm font-semibold">{t.branches}</legend>
                <div className="flex flex-wrap gap-x-4">
                  {branches.map((b) => (
                    <Checkbox key={b.id} label={b.name} checked={d.branchIds.includes(b.id)} onChange={() => set({ branchIds: toggle(d.branchIds, b.id) })} />
                  ))}
                </div>
              </fieldset>
            </div>
          ),
          summary: `${d.name.trim()} · ${days} · ${branches.filter((b) => d.branchIds.includes(b.id)).map((b) => b.name).join(", ")}`,
        },
        {
          id: "sections",
          title: w.steps.sections,
          hint: w.hints.sections,
          example: w.examples.sections,
          validate: () => (named.length ? (setStepError(null), true) : fail(w.sectionsRequired)),
          content: (
            <div className="flex flex-col gap-3">
              {errorBox}
              {d.sections.map((s, i) => (
                <div key={s.key} className="flex flex-wrap items-end gap-2 border-b border-line pb-3" data-testid="wizard-section">
                  <TextField label={`${w.sectionN(i + 1)} · ${t.sectionName}`} maxLength={80} className="min-w-0 flex-1 basis-60" value={s.name} onChange={(e) => patchSection(s.key, { name: e.target.value })} />
                  <SelectField label={`${w.sectionN(i + 1)} · ${t.sectionPositionLabel}`} value={s.positionId} onChange={(e) => patchSection(s.key, { positionId: e.target.value })} options={[{ value: "", label: t.noPosition }, ...positions.map((p) => ({ value: p.id, label: p.name }))]} />
                  <IconButton label={w.removeSection(s.name)} onClick={() => set({ sections: d.sections.filter((x) => x.key !== s.key) })}>
                    <Icon name="trash" />
                  </IconButton>
                </div>
              ))}
              <Button variant="secondary" className="self-start" onClick={() => set({ sections: [...d.sections, { key: d.next, name: "", positionId: "", items: [{ key: d.next + 1, text: "", kind: "check", isKey: false }] }], next: d.next + 2 })}>
                {t.addSection}
              </Button>
            </div>
          ),
          summary: (
            <ul className="flex flex-col text-sm">
              {named.map((s) => (
                <li key={s.key}>{w.sectionLine(s.name.trim(), filledItems(s).length)}</li>
              ))}
            </ul>
          ),
        },
        ...named.map((s) => ({
          id: `section-${s.key}`,
          title: w.itemsOf(s.name.trim()),
          hint: w.hints.items,
          example: w.examples.items,
          validate: () => (filledItems(s).length ? (setStepError(null), true) : fail(w.itemsRequired(s.name.trim()))),
          content: (
            <div className="flex flex-col gap-3">
              {errorBox}
              <ul className="flex flex-col gap-3">
                {s.items.map((i, n) => (
                  <li key={i.key} className="flex flex-wrap items-end gap-2 border-b border-line pb-3" data-testid="wizard-item">
                    <TextField label={`${w.itemN(n + 1)} · ${t.itemText}`} maxLength={200} className="min-w-0 flex-1 basis-60" value={i.text} onChange={(e) => patchItem(s.key, i.key, { text: e.target.value })} />
                    <SelectField label={`${w.itemN(n + 1)} · ${t.itemKind}`} value={i.kind} onChange={(e) => patchItem(s.key, i.key, { kind: e.target.value as Kind })} options={(["check", "photo", "comment"] as const).map((k) => ({ value: k, label: t.kinds[k] }))} />
                    {i.kind !== "comment" ? <Checkbox label={`${t.itemKey} · ${w.itemN(n + 1)}`} checked={i.isKey} onChange={(e) => patchItem(s.key, i.key, { isKey: e.target.checked })} /> : null}
                    <IconButton label={t.removeItem(i.text)} onClick={() => patchSection(s.key, { items: s.items.filter((x) => x.key !== i.key) })}>
                      <Icon name="trash" />
                    </IconButton>
                  </li>
                ))}
              </ul>
              <Button variant="secondary" className="self-start" onClick={() => set({ sections: d.sections.map((x) => (x.key === s.key ? { ...x, items: [...x.items, { key: d.next, text: "", kind: "check", isKey: false }] } : x)), next: d.next + 1 })}>
                {t.addItem}
              </Button>
            </div>
          ),
          summary: (
            <ul className="flex flex-col text-sm">
              {filledItems(s).map((i) => (
                <li key={i.key}>{w.itemLine(i.text.trim(), t.kinds[i.kind], i.kind !== "comment" && i.isKey)}</li>
              ))}
            </ul>
          ),
        })),
      ]}
    />
  );
}
