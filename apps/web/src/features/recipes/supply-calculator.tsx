"use client";

// Spec 004 RF-20 a RF-28, RF-35, RF-37: piezas completas y medias por platillo; la lista de insumos la calcula el
// servidor mientras se captura (vista previa), y se guarda en el historial o como plantilla.
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { matchesSearch } from "@/domain/search";
import { parsePieces } from "@/domain/recipes/portions";
import { es } from "@/i18n";
import type { PiecesItem, SupplyLineView } from "@/server/services/recipes/views";
import { Alert, Button, Dialog, EmptyState, Icon, LinkButton, PageHeader, SectionLabel, TextField, useToast } from "@/ui";
import { api } from "../api";
import { SupplyLines } from "./supply-lines";

const t = es.recipes.supplies;

type Values = Record<string, { full: string; half: string }>;
interface RecipeOption {
  id: string;
  name: string;
  halfPercent: number;
}

const toValues = (items: PiecesItem[]): Values => Object.fromEntries(items.map((i) => [i.recipeId, { full: String(i.full), half: String(i.half) }]));

export function SupplyCalculator({ recipes, initial, notice, dropped }: { recipes: RecipeOption[]; initial: PiecesItem[]; notice?: string; dropped: string[] }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState<Values>(() => toValues(initial));
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<{ key: string; lines: SupplyLineView[] }>({ key: "[]", lines: [] });
  const [error, setError] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const field = (id: string, kind: "full" | "half") => values[id]?.[kind] ?? "";
  const invalid = recipes.some((r) => parsePieces(field(r.id, "full")) === null || parsePieces(field(r.id, "half")) === null);
  const items = useMemo(
    () =>
      recipes
        .map((r) => ({ recipeId: r.id, full: parsePieces(values[r.id]?.full ?? "") ?? 0, half: parsePieces(values[r.id]?.half ?? "") ?? 0 }))
        .filter((i) => i.full > 0 || i.half > 0),
    [recipes, values],
  );
  const key = JSON.stringify(items);
  const lines = items.length === 0 ? [] : preview.lines;
  const loading = !invalid && items.length > 0 && preview.key !== key;

  // Vista previa (RF-22): espera 150 ms tras la última tecla y pide la lista al servidor.
  useEffect(() => {
    const current = JSON.parse(key) as PiecesItem[];
    if (invalid || current.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const r = await api<{ lines: SupplyLineView[] }>("/api/calculations/preview", { body: { items: current } });
      if (cancelled) return;
      if (r.ok) {
        setPreview({ key, lines: r.data.lines });
        setError(null);
      } else {
        setPreview({ key, lines: [] });
        setError(r.error.message);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, invalid]);

  const shown = recipes.filter((r) => matchesSearch([r.name], query));

  async function save() {
    setError(null);
    const r = await api<{ calculation: { id: string } }>("/api/calculations", { body: { items } });
    if (!r.ok) return setError(r.error.message);
    router.push(`/insumos/historial/${r.data.calculation.id}`);
  }

  async function saveTemplate(name: string, replace: boolean) {
    setDialogError(null);
    const r = await api<{ template: { name: string } }>("/api/recipe-templates", { body: { name, items, replace } });
    if (r.ok) {
      setNaming(false);
      setReplacing(null);
      toast.success(t.templateSaved(r.data.template.name));
      return;
    }
    if (r.error.code === "template_exists" && !replace) {
      setNaming(false);
      setReplacing(name);
      return;
    }
    setDialogError(r.error.message);
  }

  if (recipes.length === 0)
    return (
      <>
        <PageHeader title={t.title} subtitle={t.intro} />
        <EmptyState title={t.noRecipes} action={<LinkButton href="/recetas">{t.goRecipes}</LinkButton>} />
      </>
    );

  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={t.intro}
        figure={String(lines.length)}
        figureLabel={t.figureLabel}
        action={
          <span className="flex flex-wrap gap-2">
            <LinkButton href="/insumos/historial" variant="secondary" icon="history">
              {t.history}
            </LinkButton>
            <LinkButton href="/insumos/plantillas" variant="secondary" icon="recipe">
              {t.templates}
            </LinkButton>
          </span>
        }
      />
      {notice ? <Alert tone="info">{notice}</Alert> : null}
      {dropped.length ? <Alert tone="warning">{t.dropped(dropped.join(", "))}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <section aria-label={t.title} className="flex min-w-0 flex-1 flex-col gap-3">
          <TextField label={t.search} hideLabel placeholder={t.search} type="search" value={query} onChange={(e) => setQuery(e.target.value)} leading={<Icon name="search" size={18} className="text-ink-muted" />} />
          <p className="text-sm text-ink-muted">{t.shown(shown.length, recipes.length)}</p>
          <ul className="flex flex-col">
            {shown.map((r) => {
              const fullError = parsePieces(field(r.id, "full")) === null ? t.piecesError : undefined;
              const halfError = parsePieces(field(r.id, "half")) === null ? t.piecesError : undefined;
              const set = (kind: "full" | "half", v: string) => setValues((s) => ({ ...s, [r.id]: { full: s[r.id]?.full ?? "", half: s[r.id]?.half ?? "", [kind]: v } }));
              return (
                <li key={r.id} data-recipe={r.name} className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-line py-3 lg:grid-cols-12 lg:items-start">
                  <span className="col-span-2 flex flex-col lg:col-span-6 lg:pt-8">
                    <span className="font-semibold">{r.name}</span>
                    <span className="text-sm text-ink-muted">{t.halfNote(r.halfPercent)}</span>
                  </span>
                  <TextField label={t.full} aria-label={t.fullOf(r.name)} inputMode="numeric" autoComplete="off" placeholder="0" value={field(r.id, "full")} error={fullError} onChange={(e) => set("full", e.target.value)} className="lg:col-span-3" />
                  <TextField label={t.half} aria-label={t.halfOf(r.name)} inputMode="numeric" autoComplete="off" placeholder="0" value={field(r.id, "half")} error={halfError} onChange={(e) => set("half", e.target.value)} className="lg:col-span-3" />
                </li>
              );
            })}
          </ul>
        </section>
        <aside aria-label={t.list} className="flex flex-col gap-3 lg:sticky lg:top-6 lg:w-96 lg:rounded-lg lg:border lg:border-line lg:bg-surface lg:p-5">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel as="h2">{t.list}</SectionLabel>
            {loading ? (
              <span className="text-sm text-ink-muted" role="status">
                {t.updating}
              </span>
            ) : null}
          </div>
          {lines.length ? <SupplyLines lines={lines} label={t.list} /> : <p className="text-sm text-ink-muted">{t.listEmpty}</p>}
          <div className="sticky bottom-(--nav-space) -mx-4 flex flex-col gap-2 border-t border-line-strong bg-surface px-4 py-3 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
            <Button full disabled={invalid || items.length === 0} onAction={save}>
              {t.save}
            </Button>
            <Button
              full
              variant="secondary"
              disabled={invalid || items.length === 0}
              onClick={() => {
                setDialogError(null);
                setNaming(true);
              }}
            >
              {t.saveTemplate}
            </Button>
          </div>
        </aside>
      </div>

      <Dialog open={naming} onClose={() => setNaming(false)} title={t.templateTitle}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void saveTemplate(String(new FormData(e.currentTarget).get("name") ?? ""), false);
          }}
        >
          {dialogError ? <Alert tone="error">{dialogError}</Alert> : null}
          <TextField label={t.templateName} name="name" hint={t.templateNameHint} required maxLength={80} autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNaming(false)}>
              {es.common.cancel}
            </Button>
            <Button type="submit">{es.common.save}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={replacing !== null} onClose={() => setReplacing(null)} title={t.replaceTitle}>
        <div className="flex flex-col gap-4">
          {dialogError ? <Alert tone="error">{dialogError}</Alert> : null}
          <p>{t.replaceBody(replacing ?? "")}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReplacing(null)}>
              {es.common.cancel}
            </Button>
            <Button onAction={() => saveTemplate(replacing ?? "", true)}>{t.replace}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
