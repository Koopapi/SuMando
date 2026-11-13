"use client";

// Spec 004 RF-7 a RF-13, RF-18: alta y edición completa de una receta. La receta se guarda entera (plan, sección 5);
// las reglas y el error en español los pone el servidor.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { es } from "@/i18n";
import type { EditorProduct } from "@/server/services/recipes/recipes";
import type { RecipeDetail } from "@/server/services/recipes/views";
import { Alert, Button, Icon, NumberField, SectionLabel, SelectField, TextArea, TextField } from "@/ui";
import { api } from "../api";
import { unitShort } from "../catalog/labels";

const t = es.recipes;

interface Row {
  key: number;
  productId: string;
  quantity: string;
  presentationId: string;
  note: string;
}

let seq = 0;
const blank = (): Row => ({ key: ++seq, productId: "", quantity: "", presentationId: "", note: "" });

export function RecipeEditor({ recipe, products, onCancel }: { recipe?: RecipeDetail; products: EditorProduct[]; onCancel?: () => void }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => (recipe ? recipe.ingredients.map((i) => ({ key: ++seq, productId: i.productId, quantity: i.quantity, presentationId: "", note: i.note ?? "" })) : [blank()]));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Un ingrediente archivado que la receta ya tenía sigue elegible en su renglón (RF-14).
  const archived = (recipe?.ingredients ?? []).filter((i) => i.archived).map((i) => ({ id: i.productId, name: t.archivedProduct(i.productName), baseUnit: i.baseUnit, presentations: [] as EditorProduct["presentations"] }));
  const all = [...products, ...archived];
  const byId = new Map(all.map((p) => [p.id, p]));
  const set = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const half = String(data.get("halfPercent") ?? "").trim();
    const body = {
      name: String(data.get("name") ?? ""),
      preparation: String(data.get("preparation") ?? ""),
      halfPercent: half === "" ? undefined : Number(half),
      ingredients: rows.filter((r) => r.productId).map((r) => ({ productId: r.productId, quantity: r.quantity, presentationId: r.presentationId || null, note: r.note })),
    };
    setBusy(true);
    setError(null);
    const result = await api<{ recipe: RecipeDetail }>(recipe ? `/api/recipes/${recipe.id}` : "/api/recipes", { method: recipe ? "PUT" : "POST", body });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    if (recipe) {
      onCancel?.();
      router.refresh();
    } else router.push(`/recetas/${result.data.recipe.id}`);
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(e.currentTarget);
      }}
    >
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <TextField label={t.name} name="name" required maxLength={80} defaultValue={recipe?.name ?? ""} className="lg:col-span-2" />
        <NumberField label={t.halfPercent} name="halfPercent" hint={t.halfPercentHint} defaultValue={String(recipe?.halfPercent ?? 50)} />
      </div>

      <section aria-label={t.ingredients} className="flex flex-col gap-3">
        <SectionLabel as="h2">{t.ingredients}</SectionLabel>
        {rows.length === 0 ? <p className="text-sm text-ink-muted">{t.noIngredients}</p> : null}
        <ol className="flex flex-col">
          {rows.map((row, i) => {
            const product = byId.get(row.productId);
            const label = t.ingredientN(i + 1);
            return (
              <li key={row.key} className="border-t border-line py-3">
                <fieldset className="flex flex-col gap-3">
                  <legend className="mb-2 text-xs font-semibold tracking-widest text-ink-muted uppercase">{label}</legend>
                  <div className="grid gap-3 lg:grid-cols-12 lg:items-start">
                    <SelectField
                      label={t.product}
                      className="lg:col-span-4"
                      value={row.productId}
                      onChange={(e) => set(row.key, { productId: e.target.value, presentationId: "" })}
                      options={[{ value: "", label: t.chooseProduct }, ...all.map((p) => ({ value: p.id, label: p.name }))]}
                    />
                    <NumberField label={t.quantity} className="lg:col-span-2" value={row.quantity} onChange={(e) => set(row.key, { quantity: e.target.value })} />
                    <SelectField
                      label={t.presentation}
                      className="lg:col-span-2"
                      value={row.presentationId}
                      onChange={(e) => set(row.key, { presentationId: e.target.value })}
                      options={[{ value: "", label: product ? unitShort(product.baseUnit) : "—" }, ...(product?.presentations ?? []).map((p) => ({ value: p.id, label: `${p.name} (${p.factor} ${unitShort(product!.baseUnit)})` }))]}
                    />
                    <TextField label={t.note} className="lg:col-span-3" maxLength={120} value={row.note} onChange={(e) => set(row.key, { note: e.target.value })} />
                    <div className="flex lg:col-span-1 lg:pt-7">
                      <Button variant="ghost" aria-label={t.removeIngredient(product?.name ?? "")} onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}>
                        <Icon name="trash" size={18} />
                        <span className="lg:sr-only">{t.remove}</span>
                      </Button>
                    </div>
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ol>
        <button type="button" onClick={() => setRows((rs) => [...rs, blank()])} className="inline-flex min-h-12 items-center gap-2 self-start font-semibold text-primary">
          <Icon name="plus" size={18} />
          {t.addIngredient}
        </button>
      </section>

      <TextArea label={t.preparation} name="preparation" hint={t.preparationHint} maxLength={4000} defaultValue={recipe?.preparation ?? ""} />

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel}>
            {es.common.cancel}
          </Button>
        ) : null}
        <Button type="submit" loading={busy}>
          {es.common.save}
        </Button>
      </div>
    </form>
  );
}
