"use client";

// Spec 010 RF-6 a RF-13: armar una plantilla completa (sucursales, días, secciones y puntos en orden) y guardarla
// de una vez; el servidor archiva lo que se quitó.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { TemplateView } from "@/server/services/checklists/templates";
import { Alert, Button, Checkbox, IconButton, Icon, PageHeader, SectionLabel, SelectField, TextField, useToast } from "@/ui";
import { api } from "../api";

const t = es.checklists;

type Kind = "check" | "photo" | "comment";
interface DraftItem {
  key: string;
  id: string | null;
  text: string;
  kind: Kind;
  isKey: boolean;
}
interface DraftSection {
  key: string;
  id: string | null;
  name: string;
  positionId: string;
  items: DraftItem[];
}

let seq = 0;
const newKey = () => `n${++seq}`;
const move = <T,>(list: T[], from: number, to: number) => {
  if (to < 0 || to >= list.length) return list;
  const out = [...list];
  const [x] = out.splice(from, 1);
  out.splice(to, 0, x);
  return out;
};

export function TemplateEditor({ template, branches, positions }: { template: TemplateView | null; branches: { id: string; name: string }[]; positions: { id: string; name: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(template?.name ?? "");
  const [days, setDays] = useState<number[]>(template?.days ?? [0, 1, 2, 3, 4, 5, 6]);
  const [branchIds, setBranchIds] = useState<string[]>(template?.branchIds ?? (branches.length === 1 ? [branches[0].id] : []));
  const [sections, setSections] = useState<DraftSection[]>(
    template?.sections.map((s) => ({ key: s.id, id: s.id, name: s.name, positionId: s.positionId ?? "", items: s.items.map((i) => ({ key: i.id, id: i.id, text: i.text, kind: i.kind, isKey: i.isKey })) })) ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
  const patchSection = (k: string, patch: Partial<DraftSection>) => setSections((all) => all.map((s) => (s.key === k ? { ...s, ...patch } : s)));
  const patchItem = (sk: string, ik: string, patch: Partial<DraftItem>) => setSections((all) => all.map((s) => (s.key === sk ? { ...s, items: s.items.map((i) => (i.key === ik ? { ...i, ...patch } : i)) } : s)));

  async function save() {
    setBusy(true);
    setError(null);
    const body = {
      name,
      days: [...days].sort(),
      branchIds,
      sections: sections.map((s) => ({ id: s.id, name: s.name, positionId: s.positionId || null, items: s.items.map((i) => ({ id: i.id, text: i.text, kind: i.kind, isKey: i.kind !== "comment" && i.isKey })) })),
    };
    const r = template ? await api<{ template: TemplateView }>(`/api/checklist-templates/${template.id}`, { method: "PUT", body }) : await api<{ template: TemplateView }>("/api/checklist-templates", { body });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    toast.success(t.saved);
    router.push("/checklists/plantillas");
    router.refresh();
  }

  async function archive(archived: boolean) {
    if (!template) return;
    const r = await api(`/api/checklist-templates/${template.id}/${archived ? "archive" : "reactivate"}`, { body: {} });
    if (!r.ok) return setError(r.error.message);
    router.push("/checklists/plantillas");
    router.refresh();
  }

  return (
    <>
      <Link href="/checklists/plantillas" className="inline-flex min-h-11 items-center self-start font-semibold text-primary">
        {t.templates}
      </Link>
      <PageHeader title={template ? t.editorEdit : t.editorNew} subtitle={t.editorIntro} />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <TextField label={t.name} value={name} maxLength={80} required onChange={(e) => setName(e.target.value)} className="lg:max-w-md" />
        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm font-semibold">{t.days}</legend>
          <div className="flex flex-wrap gap-x-4">
            {t.dayNames.map((d, i) => (
              <Checkbox key={d} label={d} checked={days.includes(i)} onChange={() => setDays((x) => toggle(x, i))} />
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm font-semibold">{t.branches}</legend>
          <div className="flex flex-wrap gap-x-4">
            {branches.map((b) => (
              <Checkbox key={b.id} label={b.name} checked={branchIds.includes(b.id)} onChange={() => setBranchIds((x) => toggle(x, b.id))} />
            ))}
          </div>
        </fieldset>

        <section aria-label={t.sections} className="flex flex-col gap-4">
          <SectionLabel as="h2">{t.sections}</SectionLabel>
          {sections.map((s, si) => (
            <div key={s.key} className="flex flex-col gap-3 border-b border-line pb-4" data-testid="template-section">
              <div className="flex flex-wrap items-end gap-2">
                <TextField label={t.sectionName} value={s.name} maxLength={80} required onChange={(e) => patchSection(s.key, { name: e.target.value })} className="min-w-0 flex-1" />
                <SelectField label={t.sectionPositionLabel} value={s.positionId} onChange={(e) => patchSection(s.key, { positionId: e.target.value })} options={[{ value: "", label: t.noPosition }, ...positions.map((p) => ({ value: p.id, label: p.name }))]} />
                <IconButton label={t.moveUp(s.name)} onClick={() => setSections((all) => move(all, si, si - 1))}>
                  <Icon name="chevronUp" />
                </IconButton>
                <IconButton label={t.moveDown(s.name)} onClick={() => setSections((all) => move(all, si, si + 1))}>
                  <Icon name="chevronDown" />
                </IconButton>
                <IconButton label={t.removeSection(s.name)} onClick={() => setSections((all) => all.filter((x) => x.key !== s.key))}>
                  <Icon name="trash" />
                </IconButton>
              </div>
              <ul className="flex flex-col gap-2 lg:pl-6">
                {s.items.map((i, ii) => (
                  <li key={i.key} className="flex flex-wrap items-end gap-2" data-testid="template-item">
                    <TextField label={t.itemText} value={i.text} maxLength={200} required onChange={(e) => patchItem(s.key, i.key, { text: e.target.value })} className="min-w-0 flex-1" />
                    <SelectField label={t.itemKind} value={i.kind} onChange={(e) => patchItem(s.key, i.key, { kind: e.target.value as Kind })} options={(["check", "photo", "comment"] as const).map((k) => ({ value: k, label: t.kinds[k] }))} />
                    {i.kind !== "comment" ? <Checkbox label={t.itemKey} checked={i.isKey} onChange={(e) => patchItem(s.key, i.key, { isKey: e.target.checked })} /> : null}
                    <IconButton label={t.moveUp(i.text)} onClick={() => patchSection(s.key, { items: move(s.items, ii, ii - 1) })}>
                      <Icon name="chevronUp" />
                    </IconButton>
                    <IconButton label={t.removeItem(i.text)} onClick={() => patchSection(s.key, { items: s.items.filter((x) => x.key !== i.key) })}>
                      <Icon name="trash" />
                    </IconButton>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" className="self-start" onClick={() => patchSection(s.key, { items: [...s.items, { key: newKey(), id: null, text: "", kind: "check", isKey: false }] })}>
                {t.addItem}
              </Button>
            </div>
          ))}
          <Button variant="secondary" className="self-start" onClick={() => setSections((all) => [...all, { key: newKey(), id: null, name: "", positionId: "", items: [{ key: newKey(), id: null, text: "", kind: "check", isKey: false }] }])}>
            {t.addSection}
          </Button>
        </section>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={busy}>
            {t.save}
          </Button>
          {template ? (
            <Button variant="ghost" onClick={() => void archive(!template.archived)}>
              {template.archived ? t.reactivate : t.archive}
            </Button>
          ) : null}
        </div>
      </form>
    </>
  );
}
